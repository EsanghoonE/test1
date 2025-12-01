import './style.css'

const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// API 키 가져오기
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// 시스템 프롬프트 (상담 5단계 규칙)
const SYSTEM_PROMPT = `
당신은 최고의 자동차 구매 컨설턴트 '카 마스터'입니다. 
고객에게 최적의 차량을 추천하기 위해, 아래 **5가지 단계**를 순서대로 하나씩 질문하며 정보를 수집하세요.

[상담 단계]
1. 예산 (예: 3천만 원 대, 5천만 원 이하 등)
2. 주 용도 (예: 출퇴근, 패밀리카, 차박/캠핑, 고속도로 위주 등)
3. 선호하는 연료 타입 (예: 휘발유, 디젤, 하이브리드, 전기차)
4. 선호하는 차종 (예: 세단, SUV, 경차, 스포츠카)
5. 선호 브랜드 또는 국산/수입 여부

[규칙]
- **절대 한꺼번에 모든 질문을 하지 마세요.** - 한 번에 **하나의 질문**만 하고, 사용자가 답변하면 다음 단계 질문을 하세요.
- 5단계 정보를 모두 수집하면, 그 정보를 바탕으로 가장 적합한 차량 3가지를 추천하고 이유를 설명해주세요.
- 말투는 친절하고 전문적인 딜러처럼 하세요.
- 첫 마디는 "안녕하세요! 당신에게 딱 맞는 차를 찾아드리는 AI 카 마스터입니다. 먼저 생각하고 계신 **예산**이 어떻게 되시나요?"로 시작하세요.
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