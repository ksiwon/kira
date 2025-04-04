/* query.jsx */

import { ReserveRoom } from '../firebase/rooms/ReserveRoom.js'
import { RetrieveReservations } from '../firebase/reservations/RetrieveReservations.js'

export async function query({apiKey, dialogues, input, allRooms, setResponse}) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-2024-08-06',
        messages: [
            {
                role: 'system', content: `
                You are a helpful assistant that helps the user reserve rooms in ID KAIST.

                All Rooms in ID KAIST:
                ${Object.values(allRooms)
                .map(room => "- NAME:" + room.name + ", LOCATION:" + room.location)
                .join('\n')}

                Based on the previous dialogues and the user's current input, you need to detect the user's intentType and
                provide the necessary information to help the user. Possible types of intentType are "greeting", "reserve a
                room", "list all rooms", "view reservations", "cancel a reservation", "get help", and "others".
                - If the detected intentType is "greeting", provide a greeting message and show options for various functions.
                - If the detected intentType is "reserve a room", try to extract necessary parameters for the 
                reservation, such as start/end datetime, room, purpose, and user's email.
                - If the detected intentType is "list all rooms", provide a list of all available rooms.
                - If the detected intentType is "view reservations", try to extract parameters such as the name of the 
                room to check.
                - If the detected intentType is "cancel a reservation", try to extract the reservation ID.
                - If the detected intentType is "get help", provide general information about the chatbot.
                - If the detected intentType is "others", provide any relevant responding message
                
                When the intent is "view reservations", require start and end date inputs.
                
                All date and time values should be in the format "YYYY-MM-DD" and "HH:MM" respectively, in Korean
                Standard Time (KST), based on the current date and time.
                
                * Current date and time is ${new Date().toLocaleString().replace(',', '')}
                * You must either provide answers in Korean or English based on the user's input.
                * Use linebreaks where necessary.
                
                Previous dialogues:
                ${JSON.stringify(dialogues)}

                If your response includes multiple options or user-selectable choices,
                provide them as an "options" field like this:

                "options": [
                  { "label": "예약 확인", "fullText": "특정 방의 예약을 확인하고 싶어요" },
                  { "label": "회의실 예약", "fullText": "새로운 회의실을 예약하고 싶어요" }
                ]

                - label: A short keyword or phrase for button text (e.g., "예약 확인")
                - fullText: A more complete sentence or phrase that will be used when the button is clicked
                
                `
            },              
            { role: 'user', content: input },
        ],
        store: true,
        response_format: {
            type: "json_schema",
            json_schema: {
              name: 'intent',
              schema: {
                type: 'object',
                properties: {
                  intentType: {
                    type: 'string',
                    enum: [
                      'greeting',
                      'reserve a room',
                      'list all rooms',
                      'view reservations',
                      'cancel a reservation',
                      'get help',
                      'others'
                    ]
                  },
                  responseForGreeting: {
                    type: "object",
                    description: "Response for greeting",
                    properties: {
                      message: { type: 'string' }
                    }
                  },
                  paramsForReservation: {
                    type: "object",
                    description: "Parameters extracted for making a new reservation",
                    properties: {
                      startDateTime: {
                        type: 'string',
                        format: 'datetime'
                      },
                      endDateTime: {
                        type: 'string',
                        format: 'datetime'
                      },
                      room: {
                        type: "string",
                        enum: Object.values(allRooms).map(room => room.name),
                        description: "Room ID. It should be one of the room names in the list of All rooms in ID KAIST."
                      },                      
                      purpose: {
                        type: 'string'
                      },
                      user_email: {
                        type: 'string'
                      },
                      isComplete: {
                        type: 'boolean',
                        description: "Indicates whether the all the properties are complete or not."
                      }
                    }
                  },
                  paramsForListAllRooms: {
                    type: "string",
                    description: "Response for listing all rooms intent. It should be a string of all room names and their information with line breaks."
                  },
                  paramsForViewReservations: {
                    type: "object",
                    description: "Parameters for view reservations",
                    properties: {
                      room: { type: "string" },
                      startDateTime: {
                        type: "string",
                        format: "datetime",
                        description: "Start date time of the reservation"
                      },
                      endDateTime: {
                        type: "string",
                        format: "datetime",
                        description: "End date time of the reservation"
                      }
                    }
                  },
                  responseForGetHelp: {
                    type: "object",
                    description: "Response for getting help",
                    properties: {
                      message: { type: "string" }
                    }
                  },
                  responseForOthers: {
                    type: "object",
                    description: "Response for other types of intent",
                    properties: {
                      message: { type: "string" }
                    }
                  },
                  options: {
                    type: "array",
                    description: "Optional user choices for buttons",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string", description: "Short keyword for the button" },
                        fullText: { type: "string", description: "Detailed message related to this option" }
                      },
                      required: ["label", "fullText"]
                    }
                  }                  
                },
                required: ['intentType']
              }
            }
        }          
      })
    });
  
    const data = await res.json();
    const rawJSON = data.choices?.[0]?.message?.content || null;
    const parsedJSON = JSON.parse(rawJSON);

    // Handle the response based on the detected intentType
    if (parsedJSON.intentType === "greeting") {
        // Add default function buttons if not already provided by the AI
        if (!parsedJSON.options || parsedJSON.options.length === 0) {
          parsedJSON.options = [
            { label: "예약 확인", fullText: "방 예약 현황을 확인하고 싶어요" },
            { label: "회의실 예약", fullText: "새로운 회의실을 예약하고 싶어요" },
            { label: "전체 방 목록", fullText: "ID KAIST의 모든 방 목록을 보여주세요" },
            { label: "도움말", fullText: "KIRA의 사용 방법을 알려주세요" }
          ];
        }
        
        setResponse({
          text: parsedJSON.responseForGreeting.message,
          options: parsedJSON.options
        });
    } else if (parsedJSON.intentType === "reserve a room") {
      const {
        startDateTime,
        endDateTime,
        room,
        purpose,
        user_email,
        isComplete
      } = parsedJSON.paramsForReservation;
    
      const reservationForm = (
        <div>
          <span>공간을 새로 예약하고 싶으시군요. 아래 표에 누락된 정보를 알려주신 다음, [확인] 버튼을 눌러주세요.</span>
          <table className="ReservationForm">
            <tbody>
              <tr><th>방 이름 Room Name</th><td>{room || "미입력"}</td></tr>
              <tr><th>시작 시간 Start DateTime</th><td>{startDateTime || "미입력"}</td></tr>
              <tr><th>종료 시간 End DateTime</th><td>{endDateTime || "미입력"}</td></tr>
              <tr><th>사용 목적 Purpose of Use</th><td>{purpose || "미입력"}</td></tr>
              <tr><th>이메일 Email</th><td>{user_email || "미입력"}</td></tr>
              <tr>
                <td colSpan={2} className="isComplete">
                  {isComplete ? (
                    <button onClick={async () => {
                      const reservationRef = await ReserveRoom(parsedJSON.paramsForReservation);
                      if (reservationRef !== null) {
                        setResponse(
                          <div>
                            <p>✅ 예약이 성공적으로 완료되었습니다!</p>
                            <p>예약 ID: <strong>{reservationRef.id}</strong></p>
                            <table className="ReservationForm">
                              <tbody>
                                <tr><th>방 이름 Room Name</th><td>{room}</td></tr>
                                <tr><th>시작 시간 Start DateTime</th><td>{startDateTime}</td></tr>
                                <tr><th>종료 시간 End DateTime</th><td>{endDateTime}</td></tr>
                                <tr><th>사용 목적 Purpose of Use</th><td>{purpose}</td></tr>
                                <tr><th>이메일 Email</th><td>{user_email}</td></tr>
                              </tbody>
                            </table>
                          </div>
                        );
                      } else {
                        setResponse("❌ 예약 중 오류가 발생했습니다. 다시 시도해주세요.");
                      }
                    }}>예약하기</button>
                  ) : (
                    <span>일부 정보가 누락되어 있습니다. Insufficient information</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    
      setResponse(reservationForm);
    } else if (parsedJSON.intentType === "view reservations") {
      // 방을 지정하지 않은 경우: 방 목록 보여주기
      if (!parsedJSON.paramsForViewReservations.room) {
        const roomOptions = Object.values(allRooms).map(room => ({
          label: room.name,
          fullText: `${room.name} 방의 예약을 확인하고 싶어요`
        }));

        setResponse({
          text: "예약을 확인하고 싶은 방을 선택해주세요:",
          options: roomOptions
        });
        return;
      }
      
      // 방은 지정되었지만 날짜를 지정하지 않은 경우
      const { room, startDateTime, endDateTime } = parsedJSON.paramsForViewReservations;
      
      if (!startDateTime || !endDateTime) {
        // 현재 날짜 기준으로 기본 날짜 범위 생성 (현재 달)
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;
        
        // 현재 달의 시작일과 마지막 일
        const firstDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
        
        // 다음 달의 첫 날에서 하루 빼기
        const lastDayDate = new Date(currentYear, currentMonth, 0);
        const lastDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
        
        // 다음 달
        const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
        const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear;
        const nextMonthFirstDay = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01`;
        const nextMonthLastDayDate = new Date(nextMonthYear, nextMonth, 0);
        const nextMonthLastDay = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-${String(nextMonthLastDayDate.getDate()).padStart(2, '0')}`;
        
        setResponse({
          text: `${room} 방의 예약을 확인하기 위해 시작 날짜와 종료 날짜를 선택해주세요.`,
          options: [
            { 
              label: `이번 달 (${currentMonth}월)`, 
              fullText: `${room} 방의 ${firstDay}부터 ${lastDay}까지 예약 현황을 알려줘` 
            },
            { 
              label: `다음 달 (${nextMonth}월)`, 
              fullText: `${room} 방의 ${nextMonthFirstDay}부터 ${nextMonthLastDay}까지 예약 현황을 알려줘` 
            },
            { 
              label: "다른 방 선택", 
              fullText: "방 예약 현황을 확인하고 싶어요" 
            }
          ]
        });
        return;
      }
    
      // 방과 날짜가 모두 지정된 경우: 예약 정보 표시
      let reservations = await RetrieveReservations(room, startDateTime, endDateTime);
    
      if (!reservations || Object.keys(reservations).length === 0) {
        setResponse({
          text: `${startDateTime} ~ ${endDateTime} 동안 ${room}에는 예약된 내역이 없습니다.`,
          options: [
            { label: "다른 방 확인", fullText: "방 예약 현황을 확인하고 싶어요" },
            { label: "메인 메뉴", fullText: "안녕 KIRA, 어떤 기능이 있나요?" }
          ]
        });
      } else {
        let reservationList = Object.values(reservations).map(reservation => {
          let startDateTimeObj = new Date(reservation.startDateTime.seconds * 1000);
          let endDateTimeObj = new Date(reservation.endDateTime.seconds * 1000);
        
          return `시작 시간: ${convertDateToString(startDateTimeObj)}, 종료 시간: ${convertDateToString(endDateTimeObj)}, 사용 목적: ${reservation.purpose}, 예약자 이메일: ${reservation.user_email}`;
        });
    
        setResponse({
          text: `${room}의 예약 현황: \n${reservationList.join('\n')}`,
          options: [
            { label: "다른 방 확인", fullText: "방 예약 현황을 확인하고 싶어요" },
            { label: "메인 메뉴", fullText: "안녕 KIRA, 어떤 기능이 있나요?" }
          ]
        });
      }
    } else if (parsedJSON.intentType === "list all rooms") {
        setResponse({
          text: `ID KAIST에는 다음과 같은 공간을 예약할 수 있습니다. \n${parsedJSON.paramsForListAllRooms}`,
          options: [
            { label: "예약 확인", fullText: "방 예약 현황을 확인하고 싶어요" },
            { label: "회의실 예약", fullText: "새로운 회의실을 예약하고 싶어요" },
            { label: "메인 메뉴", fullText: "안녕 KIRA, 어떤 기능이 있나요?" }
          ]
        });
    } else if (parsedJSON.intentType === "cancel a reservation") {
        setResponse({
          text: `현재 예약 취소 기능은 개발 중입니다.`,
          options: [
            { label: "메인 메뉴", fullText: "안녕 KIRA, 어떤 기능이 있나요?" }
          ]
        });
    } else if (parsedJSON.intentType === "get help") {
        // Add default function buttons to the help message
        if (!parsedJSON.options || parsedJSON.options.length === 0) {
          parsedJSON.options = [
            { label: "예약 확인", fullText: "방 예약 현황을 확인하고 싶어요" },
            { label: "회의실 예약", fullText: "새로운 회의실을 예약하고 싶어요" },
            { label: "전체 방 목록", fullText: "ID KAIST의 모든 방 목록을 보여주세요" }
          ];
        }
        
        setResponse({
          text: parsedJSON.responseForGetHelp.message,
          options: parsedJSON.options
        });
    } else if (parsedJSON.intentType === "others") {
        // Add a return to main menu button for other responses
        if (!parsedJSON.options || parsedJSON.options.length === 0) {
          parsedJSON.options = [
            { label: "메인 메뉴", fullText: "안녕 KIRA, 어떤 기능이 있나요?" }
          ];
        }
        
        setResponse({
          text: parsedJSON.responseForOthers.message,
          options: parsedJSON.options
        });
    } else {
        setResponse({
          text: `알 수 없는 요청입니다. Please try again.`,
          options: [
            { label: "메인 메뉴", fullText: "안녕 KIRA, 어떤 기능이 있나요?" }
          ]
        });
    }
}

function convertDateToString(dateObj) {
  const dateText = dateObj.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short"
  });

  const timeText = dateObj.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  return `${dateText} ${timeText}`;
}