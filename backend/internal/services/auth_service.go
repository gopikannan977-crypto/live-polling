package services

import (
	"context"
	"errors"
	"strings"

	"github.com/pulsepoll/pulsepoll-backend/internal/auth"
	"github.com/pulsepoll/pulsepoll-backend/internal/models"
	"github.com/pulsepoll/pulsepoll-backend/internal/repositories"
	"github.com/pulsepoll/pulsepoll-backend/internal/validation"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AuthService interface {
	Signup(ctx context.Context, req models.UserSignupRequest) (*models.AuthResponse, error)
	Login(ctx context.Context, req models.UserLoginRequest) (*models.AuthResponse, error)
	GetMe(ctx context.Context, userID primitive.ObjectID) (*models.UserResponse, error)
}

type authService struct {
	userRepo  repositories.UserRepository
	jwtSecret string
}

func NewAuthService(userRepo repositories.UserRepository, jwtSecret string) AuthService {
	return &authService{
		userRepo:  userRepo,
		jwtSecret: jwtSecret,
	}
}

func (s *authService) Signup(ctx context.Context, req models.UserSignupRequest) (*models.AuthResponse, error) {
	if err := validation.ValidateEmail(req.Email); err != nil {
		return nil, err
	}
	if err := validation.ValidatePassword(req.Password); err != nil {
		return nil, err
	}

	normalizedEmail := strings.ToLower(strings.TrimSpace(req.Email))

	existing, err := s.userRepo.FindByEmail(ctx, normalizedEmail)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("user with this email already exists")
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		return nil, errors.New("failed to hash password")
	}

	user := &models.User{
		Email:        normalizedEmail,
		PasswordHash: hash,
		Name:         strings.TrimSpace(req.Name),
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	token, err := auth.GenerateJWT(user.ID.Hex(), user.Email, s.jwtSecret)
	if err != nil {
		return nil, errors.New("failed to generate access token")
	}

	return &models.AuthResponse{
		User: models.UserResponse{
			ID:        user.ID.Hex(),
			Email:     user.Email,
			Name:      user.Name,
			CreatedAt: user.CreatedAt,
		},
		Token: token,
	}, nil
}

func (s *authService) Login(ctx context.Context, req models.UserLoginRequest) (*models.AuthResponse, error) {
	normalizedEmail := strings.ToLower(strings.TrimSpace(req.Email))

	user, err := s.userRepo.FindByEmail(ctx, normalizedEmail)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("invalid email or password")
	}

	if !auth.CheckPasswordHash(req.Password, user.PasswordHash) {
		return nil, errors.New("invalid email or password")
	}

	token, err := auth.GenerateJWT(user.ID.Hex(), user.Email, s.jwtSecret)
	if err != nil {
		return nil, errors.New("failed to generate access token")
	}

	return &models.AuthResponse{
		User: models.UserResponse{
			ID:        user.ID.Hex(),
			Email:     user.Email,
			Name:      user.Name,
			CreatedAt: user.CreatedAt,
		},
		Token: token,
	}, nil
}

func (s *authService) GetMe(ctx context.Context, userID primitive.ObjectID) (*models.UserResponse, error) {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("user not found")
	}

	return &models.UserResponse{
		ID:        user.ID.Hex(),
		Email:     user.Email,
		Name:      user.Name,
		CreatedAt: user.CreatedAt,
	}, nil
}
