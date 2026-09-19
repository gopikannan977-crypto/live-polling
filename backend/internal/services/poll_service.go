package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/pulsepoll/pulsepoll-backend/internal/models"
	"github.com/pulsepoll/pulsepoll-backend/internal/redis"
	"github.com/pulsepoll/pulsepoll-backend/internal/repositories"
	"github.com/pulsepoll/pulsepoll-backend/internal/validation"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PollService interface {
	CreatePoll(ctx context.Context, ownerID primitive.ObjectID, ownerEmail string, req models.CreatePollRequest) (*models.Poll, error)
	GetPollByID(ctx context.Context, pollID primitive.ObjectID) (*models.Poll, error)
	GetPollResults(ctx context.Context, pollID primitive.ObjectID) (*models.PollResultsResponse, error)
	GetAllPolls(ctx context.Context) ([]*models.Poll, error)
	GetMyPolls(ctx context.Context, ownerID primitive.ObjectID) ([]*models.Poll, error)
	ClosePoll(ctx context.Context, pollID, ownerID primitive.ObjectID) (*models.Poll, error)
	DeletePoll(ctx context.Context, pollID, ownerID primitive.ObjectID) error
}

type pollService struct {
	pollRepo repositories.PollRepository
	voteRepo repositories.VoteRepository
	redis    *redis.RedisService
}

func NewPollService(pollRepo repositories.PollRepository, voteRepo repositories.VoteRepository, redisService *redis.RedisService) PollService {
	return &pollService{
		pollRepo: pollRepo,
		voteRepo: voteRepo,
		redis:    redisService,
	}
}

func (s *pollService) CreatePoll(ctx context.Context, ownerID primitive.ObjectID, ownerEmail string, req models.CreatePollRequest) (*models.Poll, error) {
	if err := validation.ValidatePollInput(req.Question, req.Options); err != nil {
		return nil, err
	}

	options := make([]models.PollOption, 0, len(req.Options))
	optionIDs := make([]string, 0, len(req.Options))
	counts := make(map[string]int64)

	for i, optText := range req.Options {
		optID := fmt.Sprintf("opt_%d_%s", i+1, uuid.New().String()[:8])
		options = append(options, models.PollOption{
			ID:   optID,
			Text: strings.TrimSpace(optText),
		})
		optionIDs = append(optionIDs, optID)
		counts[optID] = 0
	}

	poll := &models.Poll{
		OwnerID:    ownerID,
		OwnerEmail: ownerEmail,
		Question:   strings.TrimSpace(req.Question),
		Options:    options,
		Status:     models.PollStatusActive,
		Counts:     counts,
		TotalVotes: 0,
	}

	if err := s.pollRepo.Create(ctx, poll); err != nil {
		return nil, err
	}

	// Initialize Redis live counter hash
	if err := s.redis.InitializePollCounts(ctx, poll.ID.Hex(), optionIDs); err != nil {
		// Non-fatal, fallback handles it
	}

	return poll, nil
}

func (s *pollService) GetPollByID(ctx context.Context, pollID primitive.ObjectID) (*models.Poll, error) {
	poll, err := s.pollRepo.FindByID(ctx, pollID)
	if err != nil {
		return nil, err
	}
	if poll == nil {
		return nil, errors.New("poll not found")
	}

	// Fetch live counts from Redis
	counts, total, err := s.redis.GetPollCounts(ctx, pollID.Hex())
	if err != nil || len(counts) == 0 {
		// Fallback to MongoDB aggregation if Redis is cold
		counts, total, _ = s.voteRepo.AggregateCountsByPoll(ctx, pollID)
	}

	// Ensure all option keys are present in map
	if counts == nil {
		counts = make(map[string]int64)
	}
	for _, opt := range poll.Options {
		if _, ok := counts[opt.ID]; !ok {
			counts[opt.ID] = 0
		}
	}

	poll.Counts = counts
	poll.TotalVotes = total
	return poll, nil
}

func (s *pollService) GetPollResults(ctx context.Context, pollID primitive.ObjectID) (*models.PollResultsResponse, error) {
	poll, err := s.pollRepo.FindByID(ctx, pollID)
	if err != nil {
		return nil, err
	}
	if poll == nil {
		return nil, errors.New("poll not found")
	}

	counts, total, err := s.redis.GetPollCounts(ctx, pollID.Hex())
	if err != nil || len(counts) == 0 {
		counts, total, _ = s.voteRepo.AggregateCountsByPoll(ctx, pollID)
	}

	return &models.PollResultsResponse{
		PollID:     poll.ID.Hex(),
		Counts:     counts,
		TotalVotes: total,
		Status:     poll.Status,
	}, nil
}

func (s *pollService) GetAllPolls(ctx context.Context) ([]*models.Poll, error) {
	polls, err := s.pollRepo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	// Enrich each poll with live counts
	for _, poll := range polls {
		counts, total, err := s.redis.GetPollCounts(ctx, poll.ID.Hex())
		if err != nil || len(counts) == 0 {
			counts, total, _ = s.voteRepo.AggregateCountsByPoll(ctx, poll.ID)
		}
		poll.Counts = counts
		poll.TotalVotes = total
	}

	return polls, nil
}

func (s *pollService) GetMyPolls(ctx context.Context, ownerID primitive.ObjectID) ([]*models.Poll, error) {
	polls, err := s.pollRepo.FindByOwner(ctx, ownerID)
	if err != nil {
		return nil, err
	}

	for _, poll := range polls {
		counts, total, err := s.redis.GetPollCounts(ctx, poll.ID.Hex())
		if err != nil || len(counts) == 0 {
			counts, total, _ = s.voteRepo.AggregateCountsByPoll(ctx, poll.ID)
		}
		poll.Counts = counts
		poll.TotalVotes = total
	}

	return polls, nil
}

func (s *pollService) ClosePoll(ctx context.Context, pollID, ownerID primitive.ObjectID) (*models.Poll, error) {
	poll, err := s.pollRepo.FindByID(ctx, pollID)
	if err != nil {
		return nil, err
	}
	if poll == nil {
		return nil, errors.New("poll not found")
	}

	// Backend Ownership Validation
	if poll.OwnerID != ownerID {
		return nil, errors.New("forbidden: you do not have permission to modify this poll")
	}

	if poll.Status == models.PollStatusClosed {
		return poll, nil // Already closed
	}

	now := time.Now()
	if err := s.pollRepo.UpdateStatus(ctx, pollID, models.PollStatusClosed, &now); err != nil {
		return nil, err
	}

	poll.Status = models.PollStatusClosed
	poll.ClosedAt = &now

	// Publish poll_closed event via Redis Pub/Sub to all live WebSocket subscribers
	counts, total, _ := s.redis.GetPollCounts(ctx, pollID.Hex())
	event := models.RealtimeVoteEvent{
		Type:       "poll_closed",
		PollID:     pollID.Hex(),
		Counts:     counts,
		TotalVotes: total,
		Status:     models.PollStatusClosed,
		ClosedAt:   &now,
		Timestamp:  now,
	}
	_ = s.redis.PublishPollEvent(ctx, pollID.Hex(), event)

	return poll, nil
}

func (s *pollService) DeletePoll(ctx context.Context, pollID, ownerID primitive.ObjectID) error {
	poll, err := s.pollRepo.FindByID(ctx, pollID)
	if err != nil {
		return err
	}
	if poll == nil {
		return errors.New("poll not found")
	}

	if poll.OwnerID != ownerID {
		return errors.New("forbidden: you do not have permission to delete this poll")
	}

	return s.pollRepo.Delete(ctx, pollID)
}
