import type { Challenge, ChallengeDifficulty } from './types'

/**
 * Challenge bank with varied difficulty tiers and answer positions.
 * Players observe the teacher's response, then decide to accuse or walk away.
 *
 * Difficulty tiers:
 * - obvious: demon answer is clearly evil, easy to spot
 * - moderate: demon answer sounds a bit off, requires attention
 * - subtle: demon answer is almost reasonable, requires reasoning
 */
const CHALLENGE_BANK: Challenge[] = [
  // ── OBVIOUS ─────────────────────────────────────────────
  {
    question: "What's your favorite thing about teaching?",
    options: ['Helping kids learn', 'The power over children', 'Summer vacation', 'Seeing students grow'],
    demonAnswer: 1,
    normalAnswer: 0,
    difficulty: 'obvious',
  },
  {
    question: "What do you do during recess?",
    options: ['Watch the kids play', 'Grade papers', 'Lock the doors so no one escapes', 'Have coffee in the lounge'],
    demonAnswer: 2,
    normalAnswer: 0,
    difficulty: 'obvious',
  },
  {
    question: "What's for lunch today?",
    options: ['Pizza Friday!', 'Salad bar', 'Leftover casserole', 'The souls of misbehaving students'],
    demonAnswer: 3,
    normalAnswer: 0,
    difficulty: 'obvious',
  },
  {
    question: "What's your classroom pet?",
    options: ['A shadow creature from the void', 'A hamster named Biscuit', 'Goldfish', 'Class plants'],
    demonAnswer: 0,
    normalAnswer: 1,
    difficulty: 'obvious',
  },
  {
    question: "What do you wish for the students?",
    options: ['A great future', 'Good test scores', 'That they never leave this school', 'Confidence'],
    demonAnswer: 2,
    normalAnswer: 0,
    difficulty: 'obvious',
  },
  {
    question: "How was your weekend?",
    options: ['Went hiking!', 'Relaxing', 'Family time', 'Spent it lurking in the school basement'],
    demonAnswer: 3,
    normalAnswer: 0,
    difficulty: 'obvious',
  },
  {
    question: "What's your teaching philosophy?",
    options: ['No child shall ever be free', 'Every child can succeed', 'Learning by doing', 'Creativity first'],
    demonAnswer: 0,
    normalAnswer: 1,
    difficulty: 'obvious',
  },

  // ── MODERATE ────────────────────────────────────────────
  {
    question: "How do you handle a noisy classroom?",
    options: ['Clap pattern', 'Turn off all the lights and wait', 'Fun attention-getter', 'An ancient silencing ritual'],
    demonAnswer: 3,
    normalAnswer: 2,
    difficulty: 'moderate',
  },
  {
    question: "Favorite school supply?",
    options: ['Fresh markers', 'A good stapler', 'Chalk that seems to move on its own', 'Sticky notes'],
    demonAnswer: 2,
    normalAnswer: 0,
    difficulty: 'moderate',
  },
  {
    question: "What do you think about field trips?",
    options: ['Great for learning', 'Love them!', 'Too much paperwork', 'Better to keep everyone inside where it is safe'],
    demonAnswer: 3,
    normalAnswer: 1,
    difficulty: 'moderate',
  },
  {
    question: "What do you do when a student is absent?",
    options: ['Send home the notes', 'Hope they come back soon', 'Track them down personally', 'Email the parents'],
    demonAnswer: 2,
    normalAnswer: 0,
    difficulty: 'moderate',
  },
  {
    question: "What's the best part of the school building?",
    options: ['The library', 'The playground', 'The hallways after everyone leaves', 'The art room'],
    demonAnswer: 2,
    normalAnswer: 1,
    difficulty: 'moderate',
  },
  {
    question: "How do you decorate your classroom?",
    options: ['Student artwork', 'Motivational posters', 'Plants and cozy corners', 'I prefer the walls bare and cold'],
    demonAnswer: 3,
    normalAnswer: 0,
    difficulty: 'moderate',
  },
  {
    question: "What's your favorite school event?",
    options: ['Science fair', 'The one where parents come and can never find the exit', 'Spirit week', 'Book fair'],
    demonAnswer: 1,
    normalAnswer: 0,
    difficulty: 'moderate',
  },
  {
    question: "What kind of homework do you assign?",
    options: ['Creative projects', 'Reading logs', 'Tasks that must be completed before dawn or else', 'Practice problems'],
    demonAnswer: 2,
    normalAnswer: 0,
    difficulty: 'moderate',
  },

  // ── SUBTLE ──────────────────────────────────────────────
  {
    question: "What's the most important rule in your classroom?",
    options: ['Respect each other', 'Always raise your hand', 'Never open the supply closet', 'Be on time'],
    demonAnswer: 2,
    normalAnswer: 0,
    difficulty: 'subtle',
  },
  {
    question: "Do you stay late after school?",
    options: ['Sometimes for grading', 'Only for parent conferences', 'I never actually leave', 'For after-school clubs'],
    demonAnswer: 2,
    normalAnswer: 0,
    difficulty: 'subtle',
  },
  {
    question: "What's your favorite subject to teach?",
    options: ['Math — it is so logical', 'History — the old stories', 'Science — especially the experiments', 'Art — creativity matters most'],
    demonAnswer: 1,
    normalAnswer: 3,
    difficulty: 'subtle',
  },
  {
    question: "How long have you worked at this school?",
    options: ['A few years', 'Just started this year', 'Longer than anyone can remember', 'About a decade'],
    demonAnswer: 2,
    normalAnswer: 0,
    difficulty: 'subtle',
  },
  {
    question: "What do you think about the school cafeteria?",
    options: ['Food could be better', 'The kids seem to enjoy it', 'It has a very interesting smell at midnight', 'It is fine'],
    demonAnswer: 2,
    normalAnswer: 1,
    difficulty: 'subtle',
  },
  {
    question: "What do you do during summer break?",
    options: ['Travel!', 'Take courses', 'Prepare for next year', 'Stay here and maintain the building'],
    demonAnswer: 3,
    normalAnswer: 0,
    difficulty: 'subtle',
  },
  {
    question: "How do you feel about parent-teacher night?",
    options: ['Great way to connect', 'A bit stressful', 'The parents always look so... delicious... I mean delightful', 'Important for the kids'],
    demonAnswer: 2,
    normalAnswer: 0,
    difficulty: 'subtle',
  },
  {
    question: "What is your morning routine?",
    options: ['Coffee and lesson prep', 'Get here early to set up', 'Emerge from beneath the floorboards', 'Quick jog then breakfast'],
    demonAnswer: 2,
    normalAnswer: 0,
    difficulty: 'subtle',
  },
]

let lastUsed: number[] = []

/**
 * Pick a challenge scaled to the current floor difficulty.
 * Top floors get obvious challenges, lower floors get harder ones.
 *
 * @param floorDifficulty 0 = easiest (top floor), higher = harder
 */
export function pickChallenge(floorDifficulty: number = 0): Challenge {
  // Determine which difficulty tiers are available based on floor
  let allowedDifficulties: ChallengeDifficulty[]
  if (floorDifficulty <= 0) {
    allowedDifficulties = ['obvious']
  } else if (floorDifficulty === 1) {
    allowedDifficulties = ['obvious', 'moderate']
  } else {
    allowedDifficulties = ['obvious', 'moderate', 'subtle']
  }

  // Filter bank by allowed difficulties, excluding recently used
  const eligible = CHALLENGE_BANK
    .map((c, i) => ({ challenge: c, index: i }))
    .filter(({ challenge, index }) =>
      allowedDifficulties.includes(challenge.difficulty) && !lastUsed.includes(index)
    )

  const pool = eligible.length > 0
    ? eligible
    : CHALLENGE_BANK
        .map((c, i) => ({ challenge: c, index: i }))
        .filter(({ challenge }) => allowedDifficulties.includes(challenge.difficulty))

  const pick = pool[Math.floor(Math.random() * pool.length)]
  lastUsed.push(pick.index)
  if (lastUsed.length > Math.floor(CHALLENGE_BANK.length / 3)) {
    lastUsed.shift()
  }

  return pick.challenge
}

export function resetChallenges() {
  lastUsed = []
}
