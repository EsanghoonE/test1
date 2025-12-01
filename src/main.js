import './style.css'

const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// API 키 가져오기 (.env 파일에서)
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// GPT에게 "너는 자동차 딜러야"라고 역할 부여 (시스템 프롬프트)
const SYSTEM_PROMPT = `
당신은 전문적이고 친절한 '자동차 구매 컨설턴트'입니다. 
고객의 예산, 용도(출퇴근, 패밀리카 등), 선호하는 브랜드 등을 물어보고 
최적의 자동차 모델을 추천해주세요. 
한국 시장에 맞는 차량(현대, 기아, 제네시스, 벤츠, BMW 등) 위주로 추천하고,
답변은 너무 길지 않게 대화하듯이 해주세요.
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
sendBtn.addEventListener('click', fetchGPTResponse);
userInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') fetchGPTResponse();
});