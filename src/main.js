import './style.css'

const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfR9lvan5D3lHAOohP1XmQw4rOQN6wxQswgy7TY5sgXQQbSRw/formResponse'

const FORM_ENTRIES = {
  brand: 'entry.269822435',
  vehicleType: 'entry.469241762',
  engineType: 'entry.731398882'
}

const appRoot = document.querySelector('#app')

appRoot.innerHTML = `
  <div class="container">
    <div class="background-animation">
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
    </div>
    
    <div class="form-wrapper">
      <header class="form-header">
        <div class="header-icon">🚗</div>
        <h1>미래 모빌리티 설문</h1>
        <p class="subtitle">자동차 산업의 미래를 함께 만들어가세요</p>
      </header>

      <form id="survey-form" class="survey-form">
        <div class="form-group">
          <label for="brand" class="form-label">
            <span class="label-icon">🏭</span>
            희망하는 브랜드
          </label>
          <select id="brand" name="brand" class="form-input" required>
            <option value="">브랜드를 선택하세요</option>
            <option value="현대">현대</option>
            <option value="기아">기아</option>
            <option value="벤츠">벤츠</option>
            <option value="BMW">BMW</option>
            <option value="아우디">아우디</option>
            <option value="테슬라">테슬라</option>
            <option value="제네시스">제네시스</option>
            <option value="렉서스">렉서스</option>
            <option value="도요타">도요타</option>
            <option value="혼다">혼다</option>
            <option value="기타">기타</option>
          </select>
        </div>

        <div class="form-group">
          <label for="vehicleType" class="form-label">
            <span class="label-icon">🚙</span>
            차량 종류
          </label>
          <div class="radio-group">
            <label class="radio-option">
              <input type="radio" name="vehicleType" value="SUV" required>
              <span class="radio-custom"></span>
              <span class="radio-label">SUV</span>
            </label>
            <label class="radio-option">
              <input type="radio" name="vehicleType" value="세단" required>
              <span class="radio-custom"></span>
              <span class="radio-label">세단</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label for="engineType" class="form-label">
            <span class="label-icon">⚡</span>
            엔진 형태
          </label>
          <div class="radio-group grid">
            <label class="radio-option">
              <input type="radio" name="engineType" value="가솔린" required>
              <span class="radio-custom"></span>
              <span class="radio-label">가솔린</span>
            </label>
            <label class="radio-option">
              <input type="radio" name="engineType" value="디젤" required>
              <span class="radio-custom"></span>
              <span class="radio-label">디젤</span>
            </label>
            <label class="radio-option">
              <input type="radio" name="engineType" value="하이브리드" required>
              <span class="radio-custom"></span>
              <span class="radio-label">하이브리드</span>
            </label>
            <label class="radio-option">
              <input type="radio" name="engineType" value="전기" required>
              <span class="radio-custom"></span>
              <span class="radio-label">전기</span>
            </label>
          </div>
        </div>

        <button type="submit" class="submit-btn" id="submit-btn">
          <span class="btn-text">제출하기</span>
          <span class="btn-icon">→</span>
        </button>
      </form>

      <div id="message" class="message"></div>
    </div>
  </div>
`

const formEl = document.getElementById('survey-form')
const submitBtn = document.getElementById('submit-btn')
const messageEl = document.getElementById('message')

function showMessage(text, type = 'success') {
  messageEl.textContent = text
  messageEl.className = `message ${type}`
  messageEl.style.display = 'block'
  
  setTimeout(() => {
    messageEl.style.opacity = '0'
    setTimeout(() => {
      messageEl.style.display = 'none'
      messageEl.style.opacity = '1'
    }, 300)
  }, 3000)
}

async function submitToGoogleForms(formData) {
  const formDataToSend = new URLSearchParams()
  formDataToSend.append(FORM_ENTRIES.brand, formData.brand)
  formDataToSend.append(FORM_ENTRIES.vehicleType, formData.vehicleType)
  formDataToSend.append(FORM_ENTRIES.engineType, formData.engineType)

  try {
    const response = await fetch(GOOGLE_FORM_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formDataToSend.toString()
    })

    // no-cors 모드에서는 응답을 읽을 수 없지만 제출은 완료됨
    return { success: true }
  } catch (error) {
    console.error('제출 오류:', error)
    throw error
  }
}

formEl.addEventListener('submit', async (e) => {
  e.preventDefault()
  
  const formData = {
    brand: document.getElementById('brand').value,
    vehicleType: document.querySelector('input[name="vehicleType"]:checked')?.value,
    engineType: document.querySelector('input[name="engineType"]:checked')?.value
  }

  if (!formData.brand || !formData.vehicleType || !formData.engineType) {
    showMessage('모든 항목을 입력해주세요.', 'error')
    return
  }

  submitBtn.disabled = true
  submitBtn.querySelector('.btn-text').textContent = '제출 중...'
  submitBtn.querySelector('.btn-icon').textContent = '⏳'

  try {
    await submitToGoogleForms(formData)
    showMessage('설문이 성공적으로 제출되었습니다! 감사합니다. 🎉', 'success')
    
    // 폼 초기화
    setTimeout(() => {
      formEl.reset()
      submitBtn.disabled = false
      submitBtn.querySelector('.btn-text').textContent = '제출하기'
      submitBtn.querySelector('.btn-icon').textContent = '→'
    }, 2000)
  } catch (error) {
    showMessage('제출 중 오류가 발생했습니다. 다시 시도해주세요.', 'error')
    submitBtn.disabled = false
    submitBtn.querySelector('.btn-text').textContent = '제출하기'
    submitBtn.querySelector('.btn-icon').textContent = '→'
  }
})
