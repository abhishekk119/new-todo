// Task.jsx - Fixed version
import { useRef, useEffect, useState } from "react";

function Task({
  task,
  onDelete,
  onUpdateContent,
  onUpdateChecked,
  onUpdateDueDate,
  onMoveUp,
  onMoveDown,
  isMobile,
}) {
  const paragraphRef = useRef(null);
  const dateInputRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState(task.dueDate || "");
  const [isEditing, setIsEditing] = useState(false);

  const handleCheckboxChange = (e) => {
    onUpdateChecked(e.target.checked);
  };

  const handleDelete = () => {
    onDelete();
  };

  const handleDateChange = (e) => {
    const dateValue = e.target.value;
    setSelectedDate(dateValue);
    onUpdateDueDate(dateValue);
  };

  const handleIconClick = () => {
    dateInputRef.current?.showPicker();
  };

  const handleFocus = () => {
    if (paragraphRef.current.textContent === "Add task...") {
      paragraphRef.current.textContent = "";
      paragraphRef.current.classList.remove("placeholder");
    }
    setIsEditing(true);
  };

  const handleBlur = () => {
    const newContent = paragraphRef.current.textContent.trim();
    if (!newContent) {
      paragraphRef.current.textContent = "Add task...";
      paragraphRef.current.classList.add("placeholder");
      onUpdateContent("Add task...");
    } else {
      onUpdateContent(newContent);
    }
    setIsEditing(false);
  };

  const handleInput = () => {
    onUpdateContent(paragraphRef.current.textContent);
  };

  useEffect(() => {
    // Focus the element on mobile when it's in placeholder state
    const handleMobileFocus = () => {
      if (
        paragraphRef.current &&
        paragraphRef.current.textContent === "Add task..."
      ) {
        setTimeout(() => {
          paragraphRef.current.focus();
          const range = document.createRange();
          range.selectNodeContents(paragraphRef.current);
          range.collapse(true);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }, 50);
      }
    };

    if (paragraphRef.current && "ontouchstart" in window) {
      paragraphRef.current.addEventListener("touchstart", handleMobileFocus);
    }

    return () => {
      if (paragraphRef.current) {
        paragraphRef.current.removeEventListener(
          "touchstart",
          handleMobileFocus
        );
      }
    };
  }, []);

  useEffect(() => {
    if (paragraphRef.current && task.content) {
      if (!isEditing) {
        paragraphRef.current.textContent = task.content;

        if (task.content === "Add task...") {
          paragraphRef.current.classList.add("placeholder");
        } else {
          paragraphRef.current.classList.remove("placeholder");
        }
      }
    }
  }, [task.content, isEditing]);

  useEffect(() => {
    setSelectedDate(task.dueDate || "");
  }, [task.dueDate]);

  return (
    <div className="task-container">
      <div className="task-container-2">
        <div className="checkbox-and-task-wrapper">
          <div className="checkbox-div">
            <input
              type="checkbox"
              className="checkbox"
              checked={task.checked || false}
              onChange={handleCheckboxChange}
            />
          </div>
          <div className="task-text">
            <p
              ref={paragraphRef}
              contentEditable="true"
              suppressContentEditableWarning={true}
              className={`editable-paragraph ${
                task.checked ? "line-through" : ""
              }`}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onInput={handleInput}
            />
          </div>
        </div>
        <div className="delete-button-and-time-div">
          <button className="deletebtn" onClick={handleDelete}>
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
      <div className="duedatediv">
        <div className="calendar-and-duedate">
          <div className="date-and-duedate">
            <div className="calendar-icon-wrapper">
              <input
                type="date"
                ref={dateInputRef}
                onChange={handleDateChange}
                value={selectedDate}
              />
              <i
                className="fa-solid fa-calendar-days calendar-icon"
                onClick={handleIconClick}
              ></i>
            </div>
            {selectedDate && (
              <span
                style={{ marginLeft: "8px", fontSize: "14px", color: "#666" }}
              >
                Due by: {selectedDate}
              </span>
            )}
          </div>
          
            <div className="mobile-reorder-buttons">
              <button
                onClick={onMoveUp}
                className="reorder-btn"
                title="Move up"
              >
                <i class="fa-solid fa-circle-up"></i>
              </button>
              <button
                onClick={onMoveDown}
                className="reorder-btn"
                title="Move down"
              >
                <i class="fa-solid fa-circle-down"></i>
              </button>
            </div>
          
          <div className="time">
            <p style={{ color: "#666" }}>{task.time}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Task;
