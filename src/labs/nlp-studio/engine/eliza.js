// Bot 1: python/eliza.py in JavaScript, plus a record of every rule tried, so the chat can show
// how each reply was made. Python's re.fullmatch is a JavaScript regex anchored at both ends.

export const REFLECTIONS = {
  i: 'you', me: 'you', my: 'your', mine: 'yours', myself: 'yourself',
  am: 'are', "i'm": 'you are', "i've": 'you have', "i'll": 'you will',
  you: 'I', your: 'my', yours: 'mine', yourself: 'myself',
  are: 'am', "you're": 'I am',
}

export const RULES = [
  [String.raw`i need (.*)`, ['Why do you need {0}?', 'Would it really help you to get {0}?']],
  [String.raw`i feel (.*)`, ['Why do you feel {0}?', 'Do you often feel {0}?']],
  [String.raw`i(?: am|'m) (.*)`, ['How long have you been {0}?', 'Why do you think you are {0}?']],
  [String.raw`because (.*)`, ['Is that the real reason?', 'What else could explain {0}?']],
  [String.raw`(?:hello|hi|hey)\b.*`, ['Hello. What is on your mind?']],
  [String.raw`.*\b(mother|father|family)\b.*`, ['Tell me more about your {0}.']],
  [String.raw`(.*)\?`, ['Why do you ask that?', 'What do you think?']],
  [String.raw`(.*)`, ['Please tell me more.', 'I see. Go on.', 'How does that make you feel?']],
]

export const reflect = fragment => fragment.toLowerCase().split(/\s+/).filter(Boolean).map(w => REFLECTIONS[w] ?? w).join(' ')

// Python's str.strip() and rstrip(".!") on the lowered message.
const clean = message => message.toLowerCase().trim().replace(/[.!]+$/, '')

// The reply, and how it was made: { reply, text, tried: [pattern…], rule, groups, reflected, template }.
export function respondTrace(message, turn = 0) {
  const text = clean(message), tried = []
  for (const [k, [pattern, replies]] of RULES.entries()) {
    tried.push(pattern)
    const m = new RegExp(`^(?:${pattern})$`).exec(text)
    if (!m) continue
    const template = replies[turn % replies.length]
    const groups = m.slice(1).filter(g => g !== undefined)
    const reflected = groups.map(reflect)
    return { reply: template.replace(/\{(\d+)\}/g, (_, n) => reflected[Number(n)]), text, tried, rule: k, groups, reflected, template }
  }
  return { reply: 'Please go on.', text, tried, rule: null, groups: [], reflected: [], template: null }
}
export const respond = (message, turn = 0) => respondTrace(message, turn).reply
