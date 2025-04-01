import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase"; 

// 새로운 예약을 Firestore에 저장하는 함수
export const ReserveRoom = async (newReservationData) => {
    try {
        // Firestore에 저장할 데이터의 startDateTime과 endDateTime을 Date 객체로 변환
        newReservationData.startDateTime = new Date(newReservationData.startDateTime);
        newReservationData.endDateTime = new Date(newReservationData.endDateTime);
        // Firestore에 데이터 추가
        const reservationRef = await addDoc(collection(db, "reservations"), {
            ...newReservationData
        });
        console.log("예약 데이터가 성공적으로 저장되었습니다. reservation ID:", reservationRef.id);
        return reservationRef;  // 생성된 문서 참조 반환
    } catch (error) {
        console.error("예약 데이터 저장 실패:", error);
        return null;  // 실패 시 null 반환
    }
};

