package services

import (
	"context"
	"errors"
	"time"

	"github.com/pulsepoll/pulsepoll-backend/internal/models"
	"github.com/pulsepoll/pulsepoll-backend/internal/redis"
	"github.com/pulsepoll/pulsepoll-backend/internal/repositories"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type VoteService interface {
	CastVote(ctx context.Context, pollID primitive.ObjectID, req models.CastVoteRequest) (*models.RealtimeVoteEvent, error)
}

type voteService struct {
	pollRepo repositories.PollRepository
	voteRepo repositories.VoteRepository
	redis    *redis.RedisService
}

func NewVoteService(pollRepo repositories.PollRepository, voteRepo repositories.VoteRepository, redisService *redis.RedisService) VoteService {
	return &voteService{
		pollRepo: pollRepo,
		voteRepo: voteRepo,
		redis:    redisService,
	}
}

func (s *voteService) CastVote(ctx context.Context, pollID primitive.ObjectID, req models.CastVoteRequest) (*models.RealtimeVoteEvent, error) {
	// 1. Verify poll existence
	poll, err := s.pollRepo.FindByID(ctx, pollID)
	if err != nil {
		return nil, err
	}
	if poll == nil {
		return nil, errors.New("poll not found")
	}

	// 2. Enforce active poll status
	if poll.Status != models.PollStatusActive {
		return nil, errors.New("voting is closed for this poll")
	}

	// 3. Verify option belongs to the poll
	optionValid := false
	for _, opt := range poll.Options {
		if opt.ID == req.OptionID {
			optionValid = true
			break
		}
	}
	if !optionValid {
		return nil, errors.New("invalid option selected for this poll")
	}

	// 4. Duplicate voting prevention via voter identifier
	if req.VoterID != "" {
		hasVoted, err := s.voteRepo.HasVoted(ctx, pollID, req.VoterID)
		if err != nil {
			return nil, err
		}
		if hasVoted {
			return nil, errors.New("you have already cast a vote on this poll")
		}
	}

	// 5. Persist Vote document to MongoDB for permanent durability & audit
	vote := &models.Vote{
		PollID:   pollID,
		OptionID: req.OptionID,
		VoterID:  req.VoterID,
	}
	if err := s.voteRepo.Create(ctx, vote); err != nil {
		return nil, err
	}

	// 6. Atomic increment in Redis using HINCRBY
	_, err = s.redis.IncrementVoteCounter(ctx, pollID.Hex(), req.OptionID)
	if err != nil {
		// Log warning; system remains durable via MongoDB
	}

	// 7. Get latest aggregated counts from Redis (or fallback to Mongo)
	counts, total, err := s.redis.GetPollCounts(ctx, pollID.Hex())
	if err != nil || len(counts) == 0 {
		counts, total, _ = s.voteRepo.AggregateCountsByPoll(ctx, pollID)
	}

	// 8. Publish event to Redis Pub/Sub channel
	event := models.RealtimeVoteEvent{
		Type:       "vote_cast",
		PollID:     pollID.Hex(),
		OptionID:   req.OptionID,
		Counts:     counts,
		TotalVotes: total,
		Timestamp:  time.Now(),
	}

	_ = s.redis.PublishPollEvent(ctx, pollID.Hex(), event)

	return &event, nil
}
