package repositories

import (
	"context"
	"errors"
	"time"

	"github.com/pulsepoll/pulsepoll-backend/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type PollRepository interface {
	Create(ctx context.Context, poll *models.Poll) error
	FindByID(ctx context.Context, id primitive.ObjectID) (*models.Poll, error)
	FindAll(ctx context.Context) ([]*models.Poll, error)
	FindByOwner(ctx context.Context, ownerID primitive.ObjectID) ([]*models.Poll, error)
	UpdateStatus(ctx context.Context, id primitive.ObjectID, status models.PollStatus, closedAt *time.Time) error
	Delete(ctx context.Context, id primitive.ObjectID) error
}

type MongoPollRepository struct {
	collection *mongo.Collection
}

func NewPollRepository(db *mongo.Database) PollRepository {
	return &MongoPollRepository{
		collection: db.Collection("polls"),
	}
}

func (r *MongoPollRepository) Create(ctx context.Context, poll *models.Poll) error {
	poll.CreatedAt = time.Now()
	poll.UpdatedAt = time.Now()
	res, err := r.collection.InsertOne(ctx, poll)
	if err != nil {
		return err
	}
	poll.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *MongoPollRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*models.Poll, error) {
	var poll models.Poll
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&poll)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &poll, nil
}

func (r *MongoPollRepository) FindAll(ctx context.Context) ([]*models.Poll, error) {
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cursor, err := r.collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var polls []*models.Poll
	if err := cursor.All(ctx, &polls); err != nil {
		return nil, err
	}
	return polls, nil
}

func (r *MongoPollRepository) FindByOwner(ctx context.Context, ownerID primitive.ObjectID) ([]*models.Poll, error) {
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cursor, err := r.collection.Find(ctx, bson.M{"ownerId": ownerID}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var polls []*models.Poll
	if err := cursor.All(ctx, &polls); err != nil {
		return nil, err
	}
	return polls, nil
}

func (r *MongoPollRepository) UpdateStatus(ctx context.Context, id primitive.ObjectID, status models.PollStatus, closedAt *time.Time) error {
	update := bson.M{
		"$set": bson.M{
			"status":    status,
			"closedAt":  closedAt,
			"updatedAt": time.Now(),
		},
	}
	_, err := r.collection.UpdateOne(ctx, bson.M{"_id": id}, update)
	return err
}

func (r *MongoPollRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.collection.DeleteOne(ctx, bson.M{"_id": id})
	return err
}
