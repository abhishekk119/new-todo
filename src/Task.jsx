// Task.jsx - Final improved version
import { useRef, useEffect, useState } from "react";

function Task({
  task,
  onDelete,
  onUpdateContent,
  onUpdateChecked,
  onUpdateDueDate,
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

  // Set initial content when component mounts
  useEffect(() => {
    if (paragraphRef.current && task.content) {
      // Only update if we're not currently editing
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

  // Update selectedDate when task.dueDate changes
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
              style={{ color: "white" }}
            />
          </div>
        </div>
        <div className="delete-button-and-time-div">
          <button className="deletebtn" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>
      <div className="duedatediv">
        <div className="calendar-and-duedate">
          <div className="date-and-duedate">
            <input
              type="date"
              ref={dateInputRef}
              onChange={handleDateChange}
              value={selectedDate}
            />
            <span className="calendar-icon" onClick={handleIconClick}>
              📆
            </span>
            {selectedDate && (
              <span
                style={{ marginLeft: "8px", fontSize: "14px", color: "#666" }}
              >
                Due by: {selectedDate}
              </span>
            )}
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
