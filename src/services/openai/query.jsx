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
                - If the detected intentType is "greeting", provide a greeting message.
                - If the detected intentType is "reserve a room", try to extract necessary parameters for the 
                reservation, such as start/end datetime, room, purpose, and user's email.
                - If the detected intentType is "list all rooms", provide a list of all available rooms.
                - If the detected intentType is "view reservations", try to extract parameters such as the name of the 
                room to check.
                - If the detected intentType is "cancel a reservation", try to extract the reservation ID.
                - If the detected intentType is "get help", provide general information about the chatbot.
                - If the detected intentType is "others", provide any relevant responding message
                
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
        setResponse(parsedJSON.responseForGreeting.message);
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
        let roomNameToCheck = parsedJSON.paramsForViewReservations.room;
        let startDateTime = parsedJSON.paramsForViewReservations.startDateTime;
        let endDateTime = parsedJSON.paramsForViewReservations.endDateTime;

        if (!startDateTime || !endDateTime) {
          setResponse("조회할 시간 범위가 지정되지 않았습니다. 시작과 종료 날짜를 함께 입력해 주세요.");
          return;
        }
      
        let reservations = await RetrieveReservations(roomNameToCheck, startDateTime, endDateTime);
      
        if (!reservations || Object.keys(reservations).length === 0) {
          setResponse(`${startDateTime} ~ ${endDateTime} 동안 ${roomNameToCheck}에는 예약된 내역이 없습니다.`);
        } else {
          let reservationList = Object.values(reservations).map(reservation => {
            let startDateTimeObj = new Date(reservation.startDateTime.seconds * 1000);
            let endDateTimeObj = new Date(reservation.endDateTime.seconds * 1000);
          
            return `시작 시간: ${convertDateToString(startDateTimeObj)}, 종료 시간: ${convertDateToString(endDateTimeObj)}, 사용 목적: ${reservation.purpose}, 예약자 이메일: ${reservation.user_email}`;
          });
      
          setResponse(`${parsedJSON.paramsForViewReservations.room}의 예약상황: \n${reservationList.join('\n')}`);
        }
    } else if (parsedJSON.intentType === "list all rooms") {
        setResponse(`ID KAIST에는 다음과 같은 공간을 예약할 수 있습니다. \n${parsedJSON.paramsForListAllRooms}`);
    } else if (parsedJSON.intentType === "cancel a reservation") {
        setResponse(`Not developed yet`);
    } else if (parsedJSON.intentType === "get help") {
        setResponse(parsedJSON.responseForGetHelp.message);
    } else if (parsedJSON.intentType === "others") {
        setResponse(parsedJSON.responseForOthers.message);
    } else {
        setResponse(`알 수 없는 요청입니다. Please try again.`);
    }

    if (parsedJSON.options && parsedJSON.intentType !== "reserve a room") {
      setResponse({
        text: parsedJSON.responseForGreeting?.message || 
              parsedJSON.responseForGetHelp?.message || 
              parsedJSON.responseForOthers?.message || 
              "선택지를 확인하세요.",
        options: parsedJSON.options
      });
      return;
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
