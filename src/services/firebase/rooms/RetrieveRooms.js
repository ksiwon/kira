import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export const RetrieveRooms = async (callback) => {
    try {
        const roomRef = collection(db, "rooms");
        const roomSnap = await getDocs(roomRef);
        let rooms = {};
        roomSnap.docs.forEach((doc)=>{
            rooms[doc.id] = doc.data();
        });
        callback(rooms);
        return rooms;
    } catch (error) {
        console.error("Error getting room document:", error);
    }
}