import './style.css'

const appRoot = document.querySelector('#app')

const template = `
  <div class="gameboy-shell">
    <header class="console-header">
      <div class="console-title">자동차 산업 역사 퀴즈</div>
      <p class="console-subtitle">
        주제를 입력하면 AI가 레트로 감성의 객관식 퀴즈를 만들어 드립니다.
      </p>
    </header>

    <section class="console-panel" id="quiz-generation-area">
      <label class="sr-only" for="topic-input">퀴즈 주제 입력</label>
      <div class="screen">
        <input
          id="topic-input"
          class="gb-input"
          type="text"
          maxlength="80"
          placeholder="예: 포드 모델 T의 사회적 영향"
        />
      </div>
      <button id="generate-button" class="gb-button">퀴즈 생성 (START)</button>
      <p id="status-message" class="status-message"></p>
    </section>

    <section class="console-panel hidden" id="quiz-game-area">
      <div class="hud">
        <span id="score-display">점수: 0</span>
        <span id="question-count">문제: 0 / 0</span>
      </div>

      <div class="screen" id="question-card">
        <p id="current-question">퀴즈를 생성하면 여기에 문제가 표시됩니다.</p>
      </div>

      <div id="options-container" class="options-list"></div>
      <div id="feedback-message" class="feedback hidden"></div>
    </section>
  </div>
`

appRoot.innerHTML = template

const DOM = {
  topicInput: document.getElementById('topic-input'),
  generateButton: document.getElementById('generate-button'),
  statusMessage: document.getElementById('status-message'),
  quizGenerationArea: document.getElementById('quiz-generation-area'),
  quizGameArea: document.getElementById('quiz-game-area'),
  scoreDisplay: document.getElementById('score-display'),
  questionCountDisplay: document.getElementById('question-count'),
  currentQuestionEl: document.getElementById('current-question'),
  optionsContainer: document.getElementById('options-container'),
  feedbackMessage: document.getElementById('feedback-message')
}

const ENV = {
  apiKey: (import.meta.env?.VITE_AI_API_KEY ?? '').trim(),
  textEndpoint: (import.meta.env?.VITE_AI_TEXT_ENDPOINT ?? '').trim(),
  ttsEndpoint: (import.meta.env?.VITE_AI_TTS_ENDPOINT ?? '').trim(),
  useQueryParam: (import.meta.env?.VITE_AI_USE_QUERY_PARAM ?? 'true').toLowerCase() === 'true',
  voiceName: (import.meta.env?.VITE_AI_TTS_VOICE ?? 'Kore').trim()
}

const HEADERS = ENV.useQueryParam
  ? { 'Content-Type': 'application/json' }
  : {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ENV.apiKey}`
    }

const withKey = (url) => {
  if (!ENV.useQueryParam) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}key=${ENV.apiKey}`
}

const state = {
  quiz: [],
  index: 0,
  score: 0,
  busy: false
}

const missingEnvMessage = () => {
  const missing = []
  if (!ENV.apiKey) missing.push('VITE_AI_API_KEY')
  if (!ENV.textEndpoint) missing.push('VITE_AI_TEXT_ENDPOINT')
  if (!ENV.ttsEndpoint) missing.push('VITE_AI_TTS_ENDPOINT')
  return missing.length ? `환경 변수(${missing.join(', ')})를 설정해 주세요.` : ''
}

const showStatus = (message, type = 'neutral') => {
  DOM.statusMessage.textContent = message
  DOM.statusMessage.classList.remove('error', 'success')
  if (type === 'error') DOM.statusMessage.classList.add('error')
  if (type === 'success') DOM.statusMessage.classList.add('success')
}

const postJson = async (endpoint, payload) => {
  const response = await fetch(withKey(endpoint), {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(payload)
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`요청 실패 (${response.status}): ${text || response.statusText}`)
  }
  return response.json()
}

const pcmToWav = (pcm16, sampleRate) => {
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataLength = pcm16.byteLength
  const totalLength = 44 + dataLength
  const buffer = new ArrayBuffer(totalLength)
  const view = new DataView(buffer)
  let offset = 0

  view.setUint32(offset, 0x52494646, false); offset += 4
  view.setUint32(offset, totalLength - 8, true); offset += 4
  view.setUint32(offset, 0x57415645, false); offset += 4
  view.setUint32(offset, 0x666d7420, false); offset += 4
  view.setUint32(offset, 16, true); offset += 4
  view.setUint16(offset, 1, true); offset += 2
  view.setUint16(offset, numChannels, true); offset += 2
  view.setUint32(offset, sampleRate, true); offset += 4
  view.setUint32(offset, byteRate, true); offset += 4
  view.setUint16(offset, blockAlign, true); offset += 2
  view.setUint16(offset, bitsPerSample, true); offset += 2
  view.setUint32(offset, 0x64617461, false); offset += 4
  view.setUint32(offset, dataLength, true); offset += 4

  const dataArray = new Uint8Array(buffer, offset)
  dataArray.set(new Uint8Array(pcm16.buffer))

  return new Blob([buffer], { type: 'audio/wav' })
}

const base64ToArrayBuffer = (base64) => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

const speak = async (text) => {
  if (!text || !ENV.ttsEndpoint) return
  const payload = {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: ENV.voiceName || 'Kore' }
        }
      }
    }
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await postJson(ENV.ttsEndpoint, payload)
      const part = result?.candidates?.[0]?.content?.parts?.[0]
      const audioData = part?.inlineData?.data
      const mimeType = part?.inlineData?.mimeType
      if (audioData && mimeType?.startsWith('audio/')) {
        const sampleRateMatch = mimeType.match(/rate=(\d+)/)
        if (!sampleRateMatch) throw new Error('샘플레이트 정보를 찾을 수 없습니다.')
        const sampleRate = Number.parseInt(sampleRateMatch[1], 10)
        const pcm16 = new Int16Array(base64ToArrayBuffer(audioData))
        const wavBlob = pcmToWav(pcm16, sampleRate)
        const audioUrl = URL.createObjectURL(wavBlob)
        const audio = new Audio(audioUrl)
        audio.play()
        return
      }
      throw new Error('오디오 데이터가 비어 있습니다.')
    } catch (error) {
      console.error(`TTS 호출 실패 (${attempt + 1})`, error)
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 500))
    }
  }
}

const generateQuizContent = async (topic) => {
  const systemPrompt =
    '당신은 자동차 산업 역사 교육 전문가입니다. 요청한 주제를 토대로 4지선다형 객관식 퀴즈를 생성하세요.'
  const userQuery = `${topic}에 대한 자동차 역사 객관식 퀴즈 5개를 생성하고, 각 문항에 4개의 보기, 정답, 간결한 해설을 포함하세요.`

  const responseSchema = {
    type: 'ARRAY',
    items: {
      type: 'OBJECT',
      properties: {
        question: { type: 'STRING' },
        options: { type: 'ARRAY', items: { type: 'STRING' } },
        correctAnswer: { type: 'STRING' },
        explanation: { type: 'STRING' }
      },
      required: ['question', 'options', 'correctAnswer', 'explanation']
    }
  }

  const payload = {
    contents: [{ parts: [{ text: userQuery }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
      tools: [{ google_search: {} }]
    }
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await postJson(ENV.textEndpoint, payload)
      const jsonText = result?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!jsonText) throw new Error('AI 응답에서 JSON을 찾지 못했습니다.')
      return JSON.parse(jsonText)
    } catch (error) {
      console.error(`퀴즈 API 실패 (${attempt + 1})`, error)
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 500))
      if (attempt === 2) throw error
    }
  }
  return []
}

const updateHud = () => {
  DOM.scoreDisplay.textContent = `점수: ${state.score}`
  DOM.questionCountDisplay.textContent = `문제: ${state.index + 1} / ${state.quiz.length}`
}

const resetGame = () => {
  state.quiz = []
  state.index = 0
  state.score = 0
  DOM.quizGameArea.classList.add('hidden')
  DOM.quizGenerationArea.classList.remove('hidden')
  DOM.topicInput.value = ''
}

const loadQuestion = () => {
  if (state.index >= state.quiz.length) {
    const summary = `퀴즈 완료! 당신의 점수는 ${state.score} / ${state.quiz.length}점입니다.`
    showStatus(summary, 'success')
    speak(summary)
    resetGame()
    return
  }

  const q = state.quiz[state.index]
  DOM.currentQuestionEl.textContent = `${state.index + 1}. ${q.question}`
  DOM.optionsContainer.innerHTML = ''
  DOM.feedbackMessage.textContent = ''
  DOM.feedbackMessage.classList.add('hidden')
  DOM.feedbackMessage.classList.remove('success', 'error')
  updateHud()

  q.options.forEach((option) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'option-btn'
    button.textContent = option
    button.addEventListener('click', () => handleAnswer(option))
    DOM.optionsContainer.appendChild(button)
  })

  speak(q.question)
}

const handleAnswer = (selectedOption) => {
  if (state.busy) return
  state.busy = true

  const current = state.quiz[state.index]
  const isCorrect = selectedOption === current.correctAnswer
  const buttons = Array.from(DOM.optionsContainer.querySelectorAll('button'))

  buttons.forEach((btn) => {
    btn.disabled = true
    const text = btn.textContent
    if (text === current.correctAnswer) {
      btn.classList.add('correct')
    } else if (text === selectedOption) {
      btn.classList.add('wrong')
    }
  })

  if (isCorrect) {
    state.score += 1
    DOM.feedbackMessage.textContent = `정답입니다! ${current.explanation}`
    DOM.feedbackMessage.classList.add('success')
    speak('정답입니다!')
  } else {
    DOM.feedbackMessage.textContent = `오답입니다. 정답: ${current.correctAnswer} / 해설: ${current.explanation}`
    DOM.feedbackMessage.classList.add('error')
    speak('오답입니다. 다음 문제로 이동합니다.')
  }

  DOM.feedbackMessage.classList.remove('hidden')

  setTimeout(() => {
    state.index += 1
    state.busy = false
    loadQuestion()
  }, 3500)
}

const handleGenerateClick = async () => {
  if (state.busy) return

  const topic = DOM.topicInput.value.trim()
  if (!topic) {
    showStatus('퀴즈 주제를 입력해 주세요.', 'error')
    return
  }

  const envMessage = missingEnvMessage()
  if (envMessage) {
    showStatus(envMessage, 'error')
    return
  }

  state.busy = true
  DOM.generateButton.disabled = true
  showStatus(`"${topic}" 주제로 퀴즈를 준비 중입니다...`)

  try {
    const quiz = await generateQuizContent(topic)
    if (!Array.isArray(quiz) || quiz.length === 0) {
      showStatus('퀴즈 데이터를 받지 못했습니다. 주제를 바꿔 보세요.', 'error')
      return
    }

    state.quiz = quiz
    state.index = 0
    state.score = 0

    DOM.quizGenerationArea.classList.add('hidden')
    DOM.quizGameArea.classList.remove('hidden')
    showStatus('퀴즈가 생성되었습니다! 문제를 풀어보세요.', 'success')
    loadQuestion()
  } catch (error) {
    console.error(error)
    showStatus(`퀴즈 생성 실패: ${error.message}`, 'error')
  } finally {
    state.busy = false
    DOM.generateButton.disabled = false
  }
}

DOM.generateButton.addEventListener('click', handleGenerateClick)
DOM.topicInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    handleGenerateClick()
  }
})

