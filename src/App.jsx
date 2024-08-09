import { useState, useEffect, useCallback } from "react";
import io from "socket.io-client";

// const API_URL = "http://localhost:5000";
const API_URL = "http://13.234.175.111:5000";

const socket = io(API_URL, {
  transports: ["websocket"],
  upgrade: false,
});

function App() {
  const [slots, setSlots] = useState([]);
  const [userEmail, setUserEmail] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [bookingStatus, setBookingStatus] = useState({});

  const fetchSlots = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/slots?page=${page}&limit=12`
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

    socket.on("bookingAttempt", ({ slotId }) => {
      setBookingStatus((prev) => ({ ...prev, [slotId]: "attempting" }));
    });

    socket.on("bookingProcessStarted", ({ slotId }) => {
      setBookingStatus((prev) => ({ ...prev, [slotId]: "processing" }));
    });

    socket.on("bookingSuccessful", ({ slotId }) => {
      setBookingStatus((prev) => ({ ...prev, [slotId]: "success" }));
      setSlots((prevSlots) =>
        prevSlots.map((slot) =>
          slot._id === slotId ? { ...slot, isBooked: true } : slot
        )
      );
    });

    socket.on("bookingFailed", ({ slotId, error }) => {
      setBookingStatus((prev) => ({ ...prev, [slotId]: "failed" }));
      alert(`Booking failed: ${error}`);
    });

    return () => {
      socket.off("connect");
      socket.off("slotUpdate");
      socket.off("bookingAttempt");
      socket.off("bookingProcessStarted");
      socket.off("bookingSuccessful");
      socket.off("bookingFailed");
    };
  }, [fetchSlots]);

  const bookSlot = async (slotId) => {
    try {
      const response = await fetch(`${API_URL}/api/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slotId, userEmail }),
      });
      const data = await response.json();

      if (response.ok) {
        setBookingStatus((prev) => ({ ...prev, [slotId]: "pending" }));
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      setBookingStatus((prev) => ({ ...prev, [slotId]: "failed" }));
      alert("Booking failed: " + error.message);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchSlots(newPage);
    }
  };

  const getButtonText = (slot) => {
    if (slot.isBooked) return "Booked";
    switch (bookingStatus[slot._id]) {
      case "attempting":
        return "Attempting...";
      case "processing":
        return "Processing...";
      case "pending":
        return "Pending...";
      case "success":
        return "Booked";
      case "failed":
        return "Book Now";
      default:
        return "Book Now";
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
                  className={`slot ${slot.isBooked ? "booked" : ""} ${
                    bookingStatus[slot._id] || ""
                  }`}
                >
                  <div className="slot-info">
                    <p className="slot-date">
                      {new Date(slot.date).toLocaleDateString()}
                    </p>
                    <p className="slot-time">{slot.time}</p>
                  </div>
                  <button
                    onClick={() => bookSlot(slot._id)}
                    disabled={
                      slot.isBooked ||
                      ["attempting", "processing", "pending"].includes(
                        bookingStatus[slot._id]
                      )
                    }
                    className="book-button"
                  >
                    {getButtonText(slot)}
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