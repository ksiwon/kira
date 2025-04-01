import { collection, query, getDocs, where } from "firebase/firestore";
import { db } from "../firebase";

export const RetrieveReservations = async (roomName, startDateTime, endDateTime) => {
    try {
        if (startDateTime === undefined || endDateTime === undefined) return;
        let q;
        const reservationRef = collection(db, "reservations");
        if (roomName !== undefined) {
            q = query(reservationRef, 
                where("room", "==", roomName),
                where("startDateTime", ">=", new Date(startDateTime)),
                where("endDateTime", "<=", new Date(endDateTime)));
        } else {
            q = query(reservationRef, 
                where("startDateTime", ">", new Date(startDateTime)),
                where("endDateTime", "<", new Date(endDateTime)));
        }
        let querySnapshot = await getDocs(q);
        let reservations = {};
        querySnapshot.forEach((doc)=>{
            reservations[doc.id] = doc.data();
        });
        return reservations;
    } catch (error) {
        console.error("Error getting room document:", error);
    }
}