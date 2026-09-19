package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PollStatus string

const (
	PollStatusActive PollStatus = "active"
	PollStatusClosed PollStatus = "closed"
)

type PollOption struct {
	ID   string `bson:"id" json:"id"`
	Text string `bson:"text" json:"text"`
}

type Poll struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	OwnerID    primitive.ObjectID `bson:"ownerId" json:"ownerId"`
	OwnerEmail string             `bson:"ownerEmail,omitempty" json:"ownerEmail,omitempty"`
	Question   string             `bson:"question" json:"question"`
	Options    []PollOption       `bson:"options" json:"options"`
	Status     PollStatus         `bson:"status" json:"status"`
	CreatedAt  time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt  time.Time          `bson:"updatedAt" json:"updatedAt"`
	ClosedAt   *time.Time         `bson:"closedAt,omitempty" json:"closedAt"`

	// Enriched fields populated from Redis live counters / aggregation
	Counts     map[string]int64 `bson:"-" json:"counts"`
	TotalVotes int64            `bson:"-" json:"totalVotes"`
}

type CreatePollRequest struct {
	Question string   `json:"question" binding:"required,min=5,max=200"`
	Options  []string `json:"options" binding:"required,min=2,max=10"`
}

type PollResultsResponse struct {
	PollID     string           `json:"pollId"`
	Counts     map[string]int64 `json:"counts"`
	TotalVotes int64            `json:"totalVotes"`
	Status     PollStatus       `json:"status"`
}
