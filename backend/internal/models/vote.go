package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Vote struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PollID    primitive.ObjectID `bson:"pollId" json:"pollId"`
	OptionID  string             `bson:"optionId" json:"optionId"`
	VoterID   string             `bson:"voterId" json:"voterId"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}

type CastVoteRequest struct {
	OptionID string `json:"optionId" binding:"required"`
	VoterID  string `json:"voterId" binding:"required"`
}

type RealtimeVoteEvent struct {
	Type       string           `json:"type"` // "vote_cast" | "poll_closed" | "initial_state"
	PollID     string           `json:"pollId"`
	OptionID   string           `json:"optionId,omitempty"`
	Counts     map[string]int64 `json:"counts"`
	TotalVotes int64            `json:"totalVotes"`
	Status     PollStatus       `json:"status,omitempty"`
	ClosedAt   *time.Time       `json:"closedAt,omitempty"`
	Timestamp  time.Time        `json:"timestamp"`
}
