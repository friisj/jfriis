import type { Challenge } from './types'

/**
 * Challenge bank. Each challenge has a question, options,
 * and which answer a demon vs normal teacher would give.
 * The player observes the teacher's answer, then decides whether to accuse.
 */
const CHALLENGE_BANK: Challenge[] = [
  {
    question: "What's your favorite thing about teaching?",
    options: ['Helping kids learn', 'The power over children', 'Summer vacation', 'Seeing students grow'],
    demonAnswer: 1,
    normalAnswer: 0,
  },
  {
    question: "What do you do during recess?",
    options: ['Watch the kids play', 'Lock the doors so no one escapes', 'Grade papers', 'Have coffee in the lounge'],
    demonAnswer: 1,
    normalAnswer: 0,
  },
  {
    question: "What's for lunch today?",
    options: ['Pizza Friday!', 'The souls of misbehaving students', 'Salad bar', 'Leftover casserole'],
    demonAnswer: 1,
    normalAnswer: 0,
  },
  {
    question: "How do you handle a noisy classroom?",
    options: ['Fun attention-getter', 'Eternal silence spell', 'Turn off the lights', 'Clap pattern'],
    demonAnswer: 1,
    normalAnswer: 0,
  },
  {
    question: "What's your classroom pet?",
    options: ['A hamster named Biscuit', 'A shadow creature from the void', 'Goldfish', 'Class plants'],
    demonAnswer: 1,
    normalAnswer: 0,
  },
  {
    question: "Favorite school supply?",
    options: ['Fresh markers', 'Cursed chalk that writes by itself', 'Sticky notes', 'A good stapler'],
    demonAnswer: 1,
    normalAnswer: 0,
  },
  {
    question: "What do you wish for the students?",
    options: ['A great future', 'That they never leave this school', 'Good test scores', 'Confidence'],
    demonAnswer: 1,
    normalAnswer: 0,
  },
  {
    question: "How was your weekend?",
    options: ['Went hiking!', 'Spent it lurking in the school basement', 'Relaxing', 'Family time'],
    demonAnswer: 1,
    normalAnswer: 0,
  },
  {
    question: "What's your teaching philosophy?",
    options: ['Every child can succeed', 'No child shall ever be free', 'Learning by doing', 'Creativity first'],
    demonAnswer: 1,
    normalAnswer: 0,
  },
  {
    question: "What do you think about field trips?",
    options: ['Love them!', "Why leave when you can stay here forever?", 'Too much paperwork', 'Great for learning'],
    demonAnswer: 1,
    normalAnswer: 0,
  },
]

let lastUsed: number[] = []

/**
 * Pick a random challenge, avoiding recent repeats.
 */
export function pickChallenge(): Challenge {
  const available = CHALLENGE_BANK.filter((_, i) => !lastUsed.includes(i))
  const pool = available.length > 0 ? available : CHALLENGE_BANK

  const idx = Math.floor(Math.random() * pool.length)
  const challenge = pool[idx]
  const bankIdx = CHALLENGE_BANK.indexOf(challenge)

  lastUsed.push(bankIdx)
  if (lastUsed.length > Math.floor(CHALLENGE_BANK.length / 2)) {
    lastUsed.shift()
  }

  return challenge
}

export function resetChallenges() {
  lastUsed = []
}
