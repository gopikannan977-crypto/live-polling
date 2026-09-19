package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/pulsepoll/pulsepoll-backend/internal/middleware"
	"github.com/pulsepoll/pulsepoll-backend/internal/models"
	"github.com/pulsepoll/pulsepoll-backend/internal/services"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PollHandler struct {
	pollService services.PollService
}

func NewPollHandler(pollService services.PollService) *PollHandler {
	return &PollHandler{
		pollService: pollService,
	}
}

func (h *PollHandler) CreatePoll(c *gin.Context) {
	ownerID, ok := middleware.GetAuthenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "data": nil, "error": "Unauthorized"})
		return
	}
	ownerEmail, _ := middleware.GetAuthenticatedEmail(c)

	var req models.CreatePollRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": nil, "error": err.Error()})
		return
	}

	poll, err := h.pollService.CreatePoll(c.Request.Context(), ownerID, ownerEmail, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": nil, "error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": poll, "error": nil})
}

func (h *PollHandler) GetPoll(c *gin.Context) {
	idStr := c.Param("id")
	pollID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": nil, "error": "Invalid poll ID format"})
		return
	}

	poll, err := h.pollService.GetPollByID(c.Request.Context(), pollID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "data": nil, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": poll, "error": nil})
}

func (h *PollHandler) GetPollResults(c *gin.Context) {
	idStr := c.Param("id")
	pollID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": nil, "error": "Invalid poll ID format"})
		return
	}

	res, err := h.pollService.GetPollResults(c.Request.Context(), pollID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "data": nil, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": res, "error": nil})
}

func (h *PollHandler) GetAllPolls(c *gin.Context) {
	polls, err := h.pollService.GetAllPolls(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": nil, "error": "Failed to fetch polls"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": polls, "error": nil})
}

func (h *PollHandler) GetMyPolls(c *gin.Context) {
	ownerID, ok := middleware.GetAuthenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "data": nil, "error": "Unauthorized"})
		return
	}

	polls, err := h.pollService.GetMyPolls(c.Request.Context(), ownerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": nil, "error": "Failed to fetch polls"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": polls, "error": nil})
}

func (h *PollHandler) ClosePoll(c *gin.Context) {
	ownerID, ok := middleware.GetAuthenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "data": nil, "error": "Unauthorized"})
		return
	}

	idStr := c.Param("id")
	pollID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": nil, "error": "Invalid poll ID format"})
		return
	}

	poll, err := h.pollService.ClosePoll(c.Request.Context(), pollID, ownerID)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "forbidden: you do not have permission to modify this poll" {
			status = http.StatusForbidden
		} else if err.Error() == "poll not found" {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"success": false, "data": nil, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": poll, "error": nil})
}

func (h *PollHandler) DeletePoll(c *gin.Context) {
	ownerID, ok := middleware.GetAuthenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "data": nil, "error": "Unauthorized"})
		return
	}

	idStr := c.Param("id")
	pollID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": nil, "error": "Invalid poll ID format"})
		return
	}

	err = h.pollService.DeletePoll(c.Request.Context(), pollID, ownerID)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "forbidden: you do not have permission to delete this poll" {
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{"success": false, "data": nil, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"message": "Poll deleted successfully"}, "error": nil})
}
