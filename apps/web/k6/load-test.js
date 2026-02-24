import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

const errorRate = new Rate('errors')
const interviewDuration = new Trend('interview_start_duration', true)
const safetyDuration = new Trend('safety_classify_duration', true)
const healthDuration = new Trend('health_check_duration', true)

export const options = {
  scenarios: {
    interview_start: {
      executor: 'constant-vus',
      vus: 50,
      duration: '30s',
      exec: 'interviewStart',
      tags: { scenario: 'interview_start' },
    },
    safety_classify: {
      executor: 'constant-vus',
      vus: 20,
      duration: '30s',
      exec: 'safetyClassify',
      tags: { scenario: 'safety_classify' },
    },
    health_check: {
      executor: 'constant-vus',
      vus: 100,
      duration: '30s',
      exec: 'healthCheck',
      tags: { scenario: 'health_check' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    errors: ['rate<0.1'],
    interview_start_duration: ['p(95)<3000'],
    safety_classify_duration: ['p(95)<2000'],
    health_check_duration: ['p(95)<500'],
  },
}

export function interviewStart() {
  const res = http.post(
    `${BASE_URL}/api/interview/start`,
    JSON.stringify({}),
    { headers: { 'Content-Type': 'application/json' } },
  )

  interviewDuration.add(res.timings.duration)
  const ok = check(res, {
    'interview start returns 200': (r) => r.status === 200,
    'response has sessionId': (r) => {
      try {
        return JSON.parse(r.body).sessionId !== undefined
      } catch {
        return false
      }
    },
  })
  errorRate.add(!ok)
  sleep(0.5)
}

export function safetyClassify() {
  const payload = JSON.stringify({
    description: 'A simple task management application with user authentication and real-time updates',
  })

  const res = http.post(`${BASE_URL}/api/safety/classify`, payload, {
    headers: { 'Content-Type': 'application/json' },
  })

  safetyDuration.add(res.timings.duration)
  const ok = check(res, {
    'safety classify returns 200': (r) => r.status === 200,
    'response has classification': (r) => {
      try {
        return JSON.parse(r.body).classification !== undefined
      } catch {
        return false
      }
    },
  })
  errorRate.add(!ok)
  sleep(0.5)
}

export function healthCheck() {
  const res = http.get(`${BASE_URL}/api/health`)

  healthDuration.add(res.timings.duration)
  const ok = check(res, {
    'health returns 200': (r) => r.status === 200,
    'status is healthy or degraded': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.status === 'healthy' || body.status === 'degraded'
      } catch {
        return false
      }
    },
    'has version': (r) => {
      try {
        return JSON.parse(r.body).version === '0.1.0'
      } catch {
        return false
      }
    },
  })
  errorRate.add(!ok)
  sleep(0.2)
}
