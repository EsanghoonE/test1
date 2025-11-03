import './style.css'

const apiKey = import.meta.env.VITE_OPENAI_API_KEY

const appRoot = document.querySelector('#app')
appRoot.innerHTML = `
  <div class="chat-root">
    <header class="chat-header">상훈이의 자동차 추천챗봇</header>
    <main id="messages" class="chat-messages" aria-live="polite"></main>
    <form id="chat-form" class="chat-input" autocomplete="off">
      <input id="user-input" name="message" type="text" placeholder="예: 3천만원대, 가족용 SUV 추천해줘" required />
      <button id="send-btn" type="submit">보내기</button>
    </form>
    <footer class="chat-footer">
      클라이언트에서 API 호출 중 • 공개 배포 시 키 노출에 유의하세요
    </footer>
  </div>
`

const messagesEl = document.getElementById('messages')
const formEl = document.getElementById('chat-form')
const inputEl = document.getElementById('user-input')
const sendBtn = document.getElementById('send-btn')

/**
 * Conversation state for Chat Completions API
 */
const chatHistory = [
  {
    role: 'system',
    content:
      '당신은 자동차 구매 컨설턴트입니다. 한국 시장 기준으로 예산, 용도(출퇴근/가족/오프로드 등), 차종(SUV/세단/해치백/전기 등), 연료(가솔린/디젤/하이브리드/전기), 탑승 인원, 선호 브랜드/옵션, 신차/중고 여부, 지역(추운/더운/도심/시골) 같은 필수 정보를 모아 1~3개 후보를 추천하세요. 빠르게 가벼운 질문으로 필요한 정보를 먼저 파악하고, 각 추천에는 간단한 근거(연비/공간/안전/가성비/유지비)와 예상 가격대, 동급 대안 1개를 함께 제시하세요. 너무 장황하지 않게 6~10줄 내로 답하세요.',
  },
]

function appendMessage(role, text) {
  const wrap = document.createElement('div')
  wrap.className = role === 'user' ? 'msg msg-user' : 'msg msg-bot'
  const bubble = document.createElement('div')
  bubble.className = 'bubble'
  bubble.textContent = text
  wrap.appendChild(bubble)
  messagesEl.appendChild(wrap)
  messagesEl.scrollTop = messagesEl.scrollHeight
}

function setLoading(loading) {
  inputEl.disabled = loading
  sendBtn.disabled = loading
  sendBtn.textContent = loading ? '생각 중…' : '보내기'
}

async function sendToOpenAI(userText) {
  if (!apiKey) {
    throw new Error('환경변수 VITE_OPENAI_API_KEY가 설정되지 않았습니다.')
  }
  const payload = {
    model: 'gpt-4o-mini',
    temperature: 0.3,
    messages: chatHistory,
  }
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI 오류 ${res.status}: ${text}`)
  }
  const data = await res.json()
  const reply = data.choices?.[0]?.message?.content?.trim() || '답변을 생성하지 못했습니다.'
  return reply
}

appendMessage('bot', '안녕하세요! 자동차 구매 목적과 예산, 선호 차종을 알려주시면 추천해드릴게요 🚗')

formEl.addEventListener('submit', async (e) => {
  e.preventDefault()
  const userText = inputEl.value.trim()
  if (!userText) return
  appendMessage('user', userText)
  inputEl.value = ''

  chatHistory.push({ role: 'user', content: userText })
  setLoading(true)
  try {
    const reply = await sendToOpenAI(userText)
    chatHistory.push({ role: 'assistant', content: reply })
    appendMessage('bot', reply)
  } catch (err) {
    const msg = err instanceof Error ? err.message : '알 수 없는 오류가 발생했어요'
    appendMessage('bot', `문제가 발생했어요: ${msg}`)
  } finally {
    setLoading(false)
    inputEl.focus()
  }
})
