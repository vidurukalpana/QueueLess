// Package queue holds the queue rules as pure functions.
package queue

import (
	"crypto/subtle"
	"errors"
	"math"
)

// Position returns how many waiting tickets are ahead of mine.
func Position(waiting []int, mine int) int {
	ahead := 0
	for _, number := range waiting {
		if number < mine {
			ahead++
		}
	}
	return ahead
}

// EstimateWait returns the expected wait in minutes.
func EstimateWait(position, avgMinutes int) int {
	return position * avgMinutes
}

// AverageMinutes prefers today's measured service time over the queue default.
func AverageMinutes(todayAverage float64, queueDefault int) int {
	if todayAverage <= 0 {
		return queueDefault
	}
	return max(int(math.Round(todayAverage)), 1)
}

// Settings holds the rules a queue applies to new customers.
type Settings struct {
	AllowRemoteJoin bool
	JoinCode        string
}

// ErrRemoteBlocked means the queue only accepts customers at the shop.
var ErrRemoteBlocked = errors.New("join at the shop")

// HasValidCode reports whether code is the queue's join code.
func HasValidCode(settings Settings, code string) bool {
	return subtle.ConstantTimeCompare([]byte(code), []byte(settings.JoinCode)) == 1
}

// CanJoin applies the queue's rules to a new customer.
func CanJoin(settings Settings, code string) error {
	if !settings.AllowRemoteJoin && !HasValidCode(settings, code) {
		return ErrRemoteBlocked
	}
	return nil
}
