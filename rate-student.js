const fs = require('fs');
const path = require('path');

// Load GPT key from env or local file (same pattern as server.js)
let GPT_API_KEY = process.env.GPT_API_KEY || '';
if (!GPT_API_KEY) {
  try {
    GPT_API_KEY = fs.readFileSync(path.join(__dirname, 'gpt-key.txt'), 'utf8').trim();
  } catch (error) {
    // If there is no key, we will gracefully fall back to a neutral activities score.
    console.warn('rate-student: GPT API key not found; activities will be scored with a default value.');
  }
}

/**
 * Call GPT to rate a student's activities on a 1–10 scale.
 * Returns a number between 1 and 10 (or a neutral default of 5.5 on failure).
 *
 * @param {string} activitiesText - Multiline string describing activities.
 * @returns {Promise<number>}
 */
async function getActivitiesScore(activitiesText) {
  if (!activitiesText || !activitiesText.trim()) {
    return 5.5; // neutral if no activities provided
  }

  if (!GPT_API_KEY) {
    return 5.5;
  }

  const prompt = `
You are an experienced college admissions reader.
You will be given a student's extracurricular activities, formatted as one activity per line.
Rate the overall strength of the student's activities on a scale from 1 to 10, where:
- 1 means very weak activities,
- 5 means average/typical activities,
- 10 means exceptionally strong, highly impressive activities for competitive colleges.

Only respond with a single integer between 1 and 10, no explanation.

Student activities:
${activitiesText}
`.trim();

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GPT_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a strict but fair admissions reader. Answer with numbers only when asked for a score.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 10
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('rate-student: GPT API error:', data.error || data);
      return 5.5;
    }

    const raw = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '').trim();
    const match = raw.match(/(\d+)/);
    const score = match ? parseInt(match[1], 10) : NaN;

    if (Number.isNaN(score)) {
      return 5.5;
    }

    return Math.min(10, Math.max(1, score));
  } catch (err) {
    console.error('rate-student: error calling GPT:', err);
    return 5.5;
  }
}

/**
 * Compute a relative score for a student based on academics and activities.
 * The score is on a 0–100 scale and is meant to be *relative*, not an official rating.
 *
 * @param {Object} student
 * @param {number|string} [student.gpa]            - GPA on a 0–4 (or 0–5) scale.
 * @param {boolean} [student.weighted=true]        - Whether GPA is weighted.
 * @param {number|string} [student.sat]            - SAT total (400–1600).
 * @param {number|string} [student.act]            - ACT composite (1–36).
 * @param {Array<{course:string, score:string|number}>} [student.apCourses] - AP courses with scores.
 * @param {string} [student.activities]            - Activities text (one per line).
 * @returns {Promise<number>}                      - Promise resolving to a 0–100 score.
 */
async function rateStudent(student) {
  const {
    gpa,
    weighted = true,
    sat,
    act,
    apCourses = [],
    activities = ''
  } = student || {};

  // --- Academic normalization helpers ---

  // GPA normalized to 0–1 (treat weighted GPAs as /5, unweighted as /4)
  const gpaNum = typeof gpa === 'string' ? parseFloat(gpa) : (gpa || 0);
  const gpaMax = weighted ? 5.0 : 4.0;
  const gpaNorm = gpaNum > 0 ? Math.min(1, gpaNum / gpaMax) : 0;

  // Test score normalized to 0–1, using whichever is stronger (SAT or ACT)
  const satNum = typeof sat === 'string' ? parseInt(sat, 10) : (sat || 0);
  const actNum = typeof act === 'string' ? parseInt(act, 10) : (act || 0);

  let satNorm = 0;
  if (satNum > 0) {
    satNorm = Math.min(1, (satNum - 400) / (1600 - 400)); // 400–1600
  }

  let actNorm = 0;
  if (actNum > 0) {
    actNorm = Math.min(1, (actNum - 1) / (36 - 1)); // 1–36
  }

  const testNorm = Math.max(satNorm, actNorm);

  // AP rigor: combine count and average score into a 0–1 measure
  const validAps = (apCourses || []).filter(c => c && c.course);
  const apCount = validAps.length;
  let apAvgScore = 0;
  if (validAps.length > 0) {
    const total = validAps.reduce((sum, c) => {
      const s = typeof c.score === 'string' ? parseFloat(c.score) : (c.score || 0);
      return sum + (Number.isFinite(s) ? s : 0);
    }, 0);
    apAvgScore = total / validAps.length;
  }

  const apCountNorm = Math.min(1, apCount / 10);            // cap at 10 APs
  const apScoreNorm = Math.min(1, apAvgScore / 5);          // AP scores out of 5
  const apNorm = validAps.length > 0 ? (0.5 * apCountNorm + 0.5 * apScoreNorm) : 0;

  // Activities via GPT (0–1 after normalization)
  const activitiesScore10 = await getActivitiesScore(activities);
  const activitiesNorm = activitiesScore10 / 10; // 1–10 → 0.1–1.0

  // --- Weighted combination into a 0–100 score ---
  // Weights should sum to 1.0
  const WEIGHTS = {
    gpa: 0.35,
    tests: 0.30,
    ap: 0.15,
    activities: 0.20
  };

  const composite =
    WEIGHTS.gpa * gpaNorm +
    WEIGHTS.tests * testNorm +
    WEIGHTS.ap * apNorm +
    WEIGHTS.activities * activitiesNorm;

  // Scale to 0–100 and round
  const score = Math.round(composite * 100);
  return score;
}

module.exports = {
  rateStudent
};


