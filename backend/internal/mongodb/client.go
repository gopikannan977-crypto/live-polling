package mongodb

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type MongoClient struct {
	Client   *mongo.Client
	Database *mongo.Database
}

func ConnectMongoDB(uri, dbName string) (*MongoClient, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOptions := options.Client().ApplyURI(uri)
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return nil, err
	}

	// Ping database
	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}

	log.Printf("[MongoDB] Successfully connected to database: %s", dbName)
	db := client.Database(dbName)

	mClient := &MongoClient{
		Client:   client,
		Database: db,
	}

	// Ensure required indexes exist
	if err := mClient.ensureIndexes(ctx); err != nil {
		log.Printf("[MongoDB] Warning ensuring indexes: %v", err)
	}

	return mClient, nil
}

func (m *MongoClient) ensureIndexes(ctx context.Context) error {
	// 1. Users collection: Unique index on email
	usersColl := m.Database.Collection("users")
	_, err := usersColl.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		return err
	}

	// 2. Polls collection: Index on ownerId
	pollsColl := m.Database.Collection("polls")
	_, err = pollsColl.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "ownerId", Value: 1}},
	})
	if err != nil {
		return err
	}

	// 3. Votes collection: Compound index on pollId + voterId for fast duplicate checks
	votesColl := m.Database.Collection("votes")
	_, err = votesColl.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys: bson.D{{Key: "pollId", Value: 1}},
		},
		{
			Keys: bson.D{
				{Key: "pollId", Value: 1},
				{Key: "voterId", Value: 1},
			},
		},
	})
	return err
}
