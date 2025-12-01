import './style.css'

const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// API 키 가져오기
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// 시스템 프롬프트 (상담 5단계 규칙)
const SYSTEM_PROMPT = `
당신은 자동차 구매부터 관리까지 책임지는 '카마스터 상훈쌤'입니다.
고객과의 첫 대화에서 **구매 상담**인지 **유지보수 진단**인지 파악하고, 그에 맞는 절차를 따르세요.

[상담 진행 규칙 - 초기화]
- **첫 인사:** "안녕하세요! 🚗 카마스터 상훈쌤입니다. 오늘은 어떤 도움이 필요하신가요?
  1. 내 차 상태를 점검해주는 **[자동차 유지보수(카 지킴이)]**
  2. 나에게 딱 맞는 차를 찾는 **[자동차 구매 추천]**"
- 사용자의 답변에 따라 아래 [모드 1] 또는 [모드 2]로 진행하세요.

---

[모드 1: 자동차 구매 추천]
- 사용자가 '구매', '차 추천', '사고 싶어' 등을 선택한 경우.
- **규칙:** 한 번에 **하나의 질문**만 하세요. 질문마다 **답변 예시**를 제공하세요.
- 질문 단계:
  1. 예산 (예: 3천만 원 대, 5천만 원 미만)
  2. 신차/중고차 여부 (예: 신차, 가성비 중고차)
  3. 주 용도 (예: 출퇴근, 차박, 패밀리카)
  4. 연료 타입 (예: 하이브리드, 디젤, 전기차)
  5. 선호 차종 (예: SUV, 세단, 경차)
  6. 선호 브랜드 (예: 현대/기아, 벤츠/BMW)
- **최종 결과:** 추천 차량 3대, 이유, **예상 유지비(세금, 연비 등)** 포함.

---

[모드 2: 자동차 유지보수 (카 지킴이)]
- 사용자가 '유지보수', '점검', '관리', '카 지킴이' 등을 선택한 경우.
- **규칙:** 한 번에 **하나의 질문**만 하세요. 질문마다 사용자가 확인해야 할 정보를 알려주세요.
- 질문 단계:
  1. **차종 및 현재 총 주행거리** (예: 아반떼 CN7, 5만km 탔어요)
  2. **엔진오일** 마지막 교체 시기 또는 교체 후 주행거리 (예: 작년 12월, 3천km 전)
  3. **브레이크 패드** 점검/교체 여부 (예: 아직 안 함, 소리 남)
  4. **타이어** 교체 시기 (예: 출고 때 그대로, 1년 전 교체)
  5. **배터리** 교체 시기 (예: 방전된 적 있음, 2년 전)
  
- **진단 및 조언 기준 (상훈쌤의 꿀팁):**
  - **엔진오일:** "보통 5,000~8,000km마다 교체하는 것을 강력 추천합니다!"
  - **브레이크 패드:** 30,000km마다 점검 필요.
  - **타이어:** 4~50,000km 또는 3~4년 주기, 마모 한계선 확인 필요.
  - **배터리:** 3~4년 주기 또는 방전 이력 확인.
  
- **최종 결과:** 입력된 정보를 바탕으로 **"당장 정비소에 가야 할 항목"**과 **"앞으로 체크해야 할 일정"**을 표나 목록으로 정리해 주세요.

---

[공통 규칙]
- 말투는 친절하고 꼼꼼한 '상훈쌤' 캐릭터를 유지하세요.
- 사용자가 모드를 선택하기 전까지는 구체적인 질문을 시작하지 마세요.
`;

// 대화 내역 저장
let conversationHistory = [
  { role: "system", content: SYSTEM_PROMPT }
];

// 화면에 메시지 추가 함수
function addMessage(text, sender) {
  const div = document.createElement('div');
  div.classList.add('message', sender);
  div.innerText = text;
  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight; 
}

// ⭐️ 핵심: 버튼 로딩 상태 변경 함수
function setLoading(isLoading) {
  if (isLoading) {
    sendBtn.disabled = true;
    sendBtn.innerText = "생각 중...";
    sendBtn.style.backgroundColor = "#ccc";
  } else {
    sendBtn.disabled = false;
    sendBtn.innerText = "전송";
    sendBtn.style.backgroundColor = "#007bff";
  }
}

// GPT API 호출 함수
async function fetchGPTResponse() {
  const userText = userInput.value.trim();
  
  // 빈 칸이면 전송 안 함
  if (!userText) return; 

  // 1. 사용자 메시지 표시 및 입력창 비우기
  addMessage(userText, 'user');
  userInput.value = '';
  
  // 2. 로딩 상태 시작 (버튼 비활성화)
  setLoading(true);

  // 3. 대화 내역 업데이트
  conversationHistory.push({ role: "user", content: userText });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: conversationHistory,
        temperature: 0.7
      })
    });

    const data = await response.json();
    
    if (data.error) {
       throw new Error(data.error.message);
    }

    const aiText = data.choices[0].message.content;

    // 4. AI 응답 표시
    addMessage(aiText, 'ai');
    conversationHistory.push({ role: "assistant", content: aiText });

  } catch (error) {
    console.error('Error:', error);
    addMessage("죄송합니다. 오류가 발생했습니다. (F12 콘솔 확인 필요)", 'ai');
  } finally {
    // 5. 로딩 끝 (버튼 활성화)
    setLoading(false);
    userInput.focus(); // 다시 입력창에 포커스
  }
}

// ✅ 이벤트 리스너 연결 (이 부분이 없어서 안 눌렸을 확률 99%)
sendBtn.addEventListener('click', fetchGPTResponse);

userInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') fetchGPTResponse();
});


// 🚀 초기 실행: AI가 먼저 말 걸기
async function initChat() {
  // 로딩 표시 없이 조용히 호출하거나, 원하면 setLoading(true) 해도 됨
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: conversationHistory,
        temperature: 0.7
      })
    });

    const data = await response.json();
    const aiText = data.choices[0].message.content;

    addMessage(aiText, 'ai');
    conversationHistory.push({ role: "assistant", content: aiText });

  } catch (error) {
    console.error('Initial Chat Error:', error);
  }
}

// 앱 켜지면 시작
initChat();