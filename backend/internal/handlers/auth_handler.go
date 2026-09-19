package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/pulsepoll/pulsepoll-backend/internal/middleware"
	"github.com/pulsepoll/pulsepoll-backend/internal/models"
	"github.com/pulsepoll/pulsepoll-backend/internal/services"
)

type AuthHandler struct {
	authService services.AuthService
}

func NewAuthHandler(authService services.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

func (h *AuthHandler) Signup(c *gin.Context) {
	var req models.UserSignupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": nil, "error": err.Error()})
		return
	}

	res, err := h.authService.Signup(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": nil, "error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": res, "error": nil})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.UserLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": nil, "error": err.Error()})
		return
	}

	res, err := h.authService.Login(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "data": nil, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": res, "error": nil})
}

func (h *AuthHandler) GetMe(c *gin.Context) {
	userID, ok := middleware.GetAuthenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "data": nil, "error": "Unauthorized"})
		return
	}

	user, err := h.authService.GetMe(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "data": nil, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"user": user}, "error": nil})
}
