package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/pulsepoll/pulsepoll-backend/internal/models"
	"github.com/pulsepoll/pulsepoll-backend/internal/services"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type VoteHandler struct {
	voteService services.VoteService
}

func NewVoteHandler(voteService services.VoteService) *VoteHandler {
	return &VoteHandler{
		voteService: voteService,
	}
}

func (h *VoteHandler) CastVote(c *gin.Context) {
	idStr := c.Param("id")
	pollID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": nil, "error": "Invalid poll ID format"})
		return
	}

	var req models.CastVoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": nil, "error": err.Error()})
		return
	}

	event, err := h.voteService.CastVote(c.Request.Context(), pollID, req)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "poll not found" {
			status = http.StatusNotFound
		} else if err.Error() == "you have already cast a vote on this poll" {
			status = http.StatusConflict
		}
		c.JSON(status, gin.H{"success": false, "data": nil, "error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data": gin.H{
			"success":    true,
			"counts":     event.Counts,
			"totalVotes": event.TotalVotes,
		},
		"error": nil,
	})
}
