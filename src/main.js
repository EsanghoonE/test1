import './style.css'

const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// API 키 가져오기 (.env 파일에서)
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// GPT에게 "너는 자동차 딜러야"라고 역할 부여 (시스템 프롬프트)
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

// 대화 내역 저장 (문맥 유지를 위해)
let conversationHistory = [
  { role: "system", content: SYSTEM_PROMPT }
];

// 화면에 메시지 추가 함수
function addMessage(text, sender) {
  const div = document.createElement('div');
  div.classList.add('message', sender);
  div.innerText = text;
  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight; // 스크롤 내리기
}

// GPT API 호출 함수
async function fetchGPTResponse() {
  const userText = userInput.value;
  if (!userText) return;

  // 1. 사용자 메시지 화면 표시
  addMessage(userText, 'user');
  userInput.value = '';
  
  // 2. 대화 내역에 사용자 메시지 추가
  conversationHistory.push({ role: "user", content: userText });

  try {
    // 3. API 호출
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // 또는 "gpt-4"
        messages: conversationHistory,
        temperature: 0.7
      })
    });

    const data = await response.json();
    const aiText = data.choices[0].message.content;

    // 4. AI 응답 화면 표시 및 대화 내역 저장
    addMessage(aiText, 'ai');
    conversationHistory.push({ role: "assistant", content: aiText });

  } catch (error) {
    console.error('Error:', error);
    addMessage("죄송합니다. 오류가 발생했습니다.", 'ai');
  }
}

// 이벤트 리스너 (버튼 클릭 및 엔터키)
// ... 기존 코드 (이벤트 리스너들) ...

// [추가] 페이지 로드 시 AI가 먼저 대화 시작하기
async function initChat() {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: conversationHistory, // 시스템 프롬프트만 들어있는 초기 상태
        temperature: 0.7
      })
    });

    const data = await response.json();
    const aiText = data.choices[0].message.content;

    // 화면에 표시 및 대화 내역 저장
    addMessage(aiText, 'ai');
    conversationHistory.push({ role: "assistant", content: aiText });

  } catch (error) {
    console.error('Initial Chat Error:', error);
  }
}

// 앱 실행 시 바로 호출
initChat();