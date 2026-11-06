// Package queue holds the queue rules as pure functions.
package queue

import "math"

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
