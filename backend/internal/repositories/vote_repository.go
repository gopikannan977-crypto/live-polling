package repositories

import (
	"context"
	"time"

	"github.com/pulsepoll/pulsepoll-backend/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type VoteRepository interface {
	Create(ctx context.Context, vote *models.Vote) error
	HasVoted(ctx context.Context, pollID primitive.ObjectID, voterID string) (bool, error)
	AggregateCountsByPoll(ctx context.Context, pollID primitive.ObjectID) (map[string]int64, int64, error)
}

type MongoVoteRepository struct {
	collection *mongo.Collection
}

func NewVoteRepository(db *mongo.Database) VoteRepository {
	return &MongoVoteRepository{
		collection: db.Collection("votes"),
	}
}

func (r *MongoVoteRepository) Create(ctx context.Context, vote *models.Vote) error {
	vote.CreatedAt = time.Now()
	res, err := r.collection.InsertOne(ctx, vote)
	if err != nil {
		return err
	}
	vote.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *MongoVoteRepository) HasVoted(ctx context.Context, pollID primitive.ObjectID, voterID string) (bool, error) {
	if voterID == "" {
		return false, nil
	}
	count, err := r.collection.CountDocuments(ctx, bson.M{
		"pollId":  pollID,
		"voterId": voterID,
	})
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// AggregateCountsByPoll serves as durable fallback when Redis cache is cold
func (r *MongoVoteRepository) AggregateCountsByPoll(ctx context.Context, pollID primitive.ObjectID) (map[string]int64, int64, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "pollId", Value: pollID}}}},
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: "$optionId"},
			{Key: "count", Value: bson.D{{Key: "$sum", Value: 1}}},
		}}},
	}

	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	type aggResult struct {
		OptionID string `bson:"_id"`
		Count    int64  `bson:"count"`
	}

	var results []aggResult
	if err := cursor.All(ctx, &results); err != nil {
		return nil, 0, err
	}

	counts := make(map[string]int64)
	var total int64 = 0
	for _, res := range results {
		counts[res.OptionID] = res.Count
		total += res.Count
	}

	return counts, total, nil
}
