import { useState, useEffect, useCallback } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000", {
  transports: ["websocket"],
  upgrade: false,
});

// const API_URL = "http://localhost:5000/api/slots";
const API_URL = "http://13.234.175.111:5000/api";


function App() {
  const [slots, setSlots] = useState([]);
  const [userEmail, setUserEmail] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSlots = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/slots?page=${page}&limit=12`
      );
      const data = await response.json();
      setSlots(data.docs);
      setCurrentPage(data.page);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error("Error fetching slots:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots();

    socket.on("connect", () => {
      console.log("Connected to server");
    });

    socket.on("slotUpdate", ({ slotId, isBooked }) => {
      setSlots((prevSlots) =>
        prevSlots.map((slot) =>
          slot._id === slotId ? { ...slot, isBooked } : slot
        )
      );
    });

    return () => {
      socket.off("connect");
      socket.off("slotUpdate");
    };
  }, [fetchSlots]);

  const bookSlot = async (slotId) => {
    try {
      const response = await fetch(`${API_URL}/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slotId, userEmail }),
      });
      const data = await response.json();

      if (response.ok) {
        alert(data.message);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      alert("Booking failed: " + error.message);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchSlots(newPage);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Slot Booking App</h1>
        <input
          type="email"
          placeholder="Your email"
          value={userEmail}
          onChange={(e) => setUserEmail(e.target.value)}
          className="email-input"
        />
      </header>
      <main className="main">
        {isLoading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading slots...</p>
          </div>
        ) : (
          <>
            <div className="slots-grid">
              {slots.map((slot) => (
                <div
                  key={slot._id}
                  className={`slot ${slot.isBooked ? "booked" : ""}`}
                >
                  <div className="slot-info">
                    <p className="slot-date">
                      {new Date(slot.date).toLocaleDateString()}
                    </p>
                    <p className="slot-time">{slot.time}</p>
                  </div>
                  <button
                    onClick={() => bookSlot(slot._id)}
                    disabled={slot.isBooked}
                    className="book-button"
                  >
                    {slot.isBooked ? "Booked" : "Book Now"}
                  </button>
                </div>
              ))}
            </div>
            <div className="pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-button"
              >
                Previous
              </button>
              <span className="page-indicator">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-button"
              >
                Next
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
