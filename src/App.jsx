import { useState, useEffect, useRef } from "react";
import "./App.css";
import Task from "./Task";
import { motion, AnimatePresence } from "framer-motion";

// Storage functions
const loadFromStorage = (key, defaultValue) => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;

    const parsed = JSON.parse(item);

    // Add validation for critical data structures
    if (key === "tasks") {
      // Ensure tasks is always an object with array values
      if (typeof parsed !== "object" || parsed === null) {
        return defaultValue;
      }
      // Clean up any non-array values
      Object.keys(parsed).forEach((listId) => {
        if (!Array.isArray(parsed[listId])) {
          parsed[listId] = [];
        }
      });
      return parsed;
    }

    if (key === "taskLists") {
      // Ensure taskLists is always an object with array values
      if (typeof parsed !== "object" || parsed === null) {
        return defaultValue;
      }
      return parsed;
    }

    return parsed;
  } catch (error) {
    console.error("Error loading from storage:", error);
    return defaultValue;
  }
};

const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Error saving to storage:", error);
  }
};

// Helper function to get current date string
const getCurrentDateString = () => {
  const today = new Date();
  return `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
};

// Helper function to compare dates
const isDateAfter = (date1, date2) => {
  const [day1, month1, year1] = date1.split("/").map(Number);
  const [day2, month2, year2] = date2.split("/").map(Number);

  const dateObj1 = new Date(year1, month1 - 1, day1);
  const dateObj2 = new Date(year2, month2 - 1, day2);

  return dateObj1 > dateObj2;
};

function App() {
  const taskGroupContainerRef = useRef(null);
  const isEditingRef = useRef(false);

  // Add this at the beginning of your App component
  useEffect(() => {
    // Check if data structure is corrupted and reset if needed
    const tasksData = loadFromStorage("tasks", {});
    if (tasksData && typeof tasksData === "object") {
      let needsReset = false;
      Object.keys(tasksData).forEach((key) => {
        if (!Array.isArray(tasksData[key])) {
          needsReset = true;
        }
      });

      if (needsReset) {
        localStorage.removeItem("tasks");
        localStorage.removeItem("taskLists");
        localStorage.removeItem("newTaskGroup");
        localStorage.removeItem("listCategories");
        localStorage.removeItem("incompleteCounts");
        localStorage.removeItem("expandedStates");
        localStorage.removeItem("tasksExpandedStates");
        window.location.reload();
      }
    }
  }, []);
  // Initialize ALL state from localStorage
  const [newTaskGroup, setNewTaskGroup] = useState(() =>
    loadFromStorage("newTaskGroup", [])
  );
  const [taskLists, setTaskLists] = useState(() =>
    loadFromStorage("taskLists", {})
  );
  const [tasks, setTasks] = useState(() => loadFromStorage("tasks", {}));
  const [listCategories, setListCategories] = useState(() =>
    loadFromStorage("listCategories", {})
  );
  const [openCategories, setOpenCategories] = useState(null);
  const [incompleteCounts, setIncompleteCounts] = useState(() =>
    loadFromStorage("incompleteCounts", {})
  );
  const [expandedStates, setExpandedStates] = useState(() =>
    loadFromStorage("expandedStates", {})
  );
  const [tasksExpandedStates, setTasksExpandedStates] = useState(() =>
    loadFromStorage("tasksExpandedStates", {})
  );

  // Save ALL data whenever ANY state changes
  useEffect(() => {
    saveToStorage("newTaskGroup", newTaskGroup);
    saveToStorage("taskLists", taskLists);
    saveToStorage("tasks", tasks);
    saveToStorage("listCategories", listCategories);
    saveToStorage("incompleteCounts", incompleteCounts);
    saveToStorage("expandedStates", expandedStates);
    saveToStorage("tasksExpandedStates", tasksExpandedStates);
  }, [
    newTaskGroup,
    taskLists,
    tasks,
    listCategories,
    incompleteCounts,
    expandedStates,
    tasksExpandedStates,
  ]);

  // Calculate incomplete tasks whenever tasks change
  useEffect(() => {
    const newIncompleteCounts = {};

    Object.keys(tasks).forEach((listId) => {
      const listTasks = tasks[listId] || [];
      const incomplete = listTasks.filter((task) => !task.checked).length;
      newIncompleteCounts[listId] = incomplete;
    });

    setIncompleteCounts(newIncompleteCounts);
  }, [tasks]);

  function updateTaskGroup() {
    const today = new Date();
    const taskDate = `${today.getDate()}/${
      today.getMonth() + 1
    }/${today.getFullYear()}`;

    const newTaskGroupItem = {
      id: Date.now(),
      date: taskDate,
    };

    // Add new task group to the beginning of the array
    setNewTaskGroup((prev) => [newTaskGroupItem, ...prev]);
  }

  const taskGroupByDate = newTaskGroup.reduce((groups, task) => {
    if (!groups[task.date]) {
      groups[task.date] = [];
    }
    groups[task.date].push(task);
    return groups;
  }, {});

  const dategroupArray = Object.entries(taskGroupByDate);

  // Use insertBefore to ensure new task groups appear at the top
  useEffect(() => {
    // Check if user is currently editing to avoid interrupting
    if (document.activeElement && document.activeElement.isContentEditable) {
      isEditingRef.current = true;
      return; // Don't reorder while user is editing
    }

    isEditingRef.current = false;

    if (taskGroupContainerRef.current && dategroupArray.length > 0) {
      const container = taskGroupContainerRef.current;
      const children = Array.from(container.children);

      // Reorder children based on the order in dategroupArray (newest first)
      children.sort((a, b) => {
        const aIndex = dategroupArray.findIndex(
          ([date]) => a.querySelector("h3").textContent === date
        );
        const bIndex = dategroupArray.findIndex(
          ([date]) => b.querySelector("h3").textContent === date
        );
        return aIndex - bIndex;
      });

      // Re-append children in correct order
      children.forEach((child) => container.appendChild(child));
    }
  }, [dategroupArray]);

  function deleteTaskGroup(datestring) {
    // Get all list IDs in this task group
    const listIds = taskLists[datestring]?.map((list) => list.id) || [];

    // Remove the task group from newTaskGroup
    setNewTaskGroup((prev) => prev.filter((task) => task.date !== datestring));

    // Remove the task group from taskLists
    setTaskLists((prev) => {
      const updated = { ...prev };
      delete updated[datestring];
      return updated;
    });

    // Remove all tasks associated with lists in this task group
    setTasks((prev) => {
      const updated = { ...prev };
      listIds.forEach((id) => delete updated[id]);
      return updated;
    });

    // Remove list categories for lists in this task group
    setListCategories((prev) => {
      const updated = { ...prev };
      listIds.forEach((id) => delete updated[id]);
      return updated;
    });

    // Remove incomplete counts for lists in this task group
    setIncompleteCounts((prev) => {
      const updated = { ...prev };
      listIds.forEach((id) => delete updated[id]);
      return updated;
    });

    // Remove expanded states for lists in this task group
    setExpandedStates((prev) => {
      const updated = { ...prev };
      listIds.forEach((id) => delete updated[id]);
      return updated;
    });

    // Remove tasks expanded states for lists in this task group
    setTasksExpandedStates((prev) => {
      const updated = { ...prev };
      listIds.forEach((id) => delete updated[id]);
      return updated;
    });
  }

  function updatelist(datestring) {
    const newListId = Date.now();

    setTaskLists((prev) => ({
      ...prev,
      [datestring]: [...(prev[datestring] || []), { id: newListId }],
    }));

    setTasks((prev) => ({
      ...prev,
      [newListId]: [],
    }));

    setListCategories((prev) => ({
      ...prev,
      [newListId]: "categories",
    }));

    setIncompleteCounts((prev) => ({
      ...prev,
      [newListId]: 0,
    }));

    // Set new list to expanded by default
    setExpandedStates((prev) => ({
      ...prev,
      [newListId]: true,
    }));

    // Set new tasks container to expanded by default
    setTasksExpandedStates((prev) => ({
      ...prev,
      [newListId]: true,
    }));
  }

  function updatetask(listId) {
    const taskTime = new Date()
      .toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .toUpperCase();

    const newTask = {
      id: Date.now(),
      time: taskTime,
      content: "Add task...",
      checked: false,
      dueDate: "",
      createdDate: getCurrentDateString(),
      lastEditedDate: getCurrentDateString(),
    };

    setTasks((prev) => ({
      ...prev,
      [listId]: [...(prev[listId] || []), newTask],
    }));

    // Update incomplete count
    setIncompleteCounts((prev) => ({
      ...prev,
      [listId]: (prev[listId] || 0) + 1,
    }));
  }

  function deleteTask(listId, taskId) {
    setTasks((prev) => {
      // Ensure we have an array to filter
      const currentTasks = prev[listId];
      const tasksArray = Array.isArray(currentTasks) ? currentTasks : [];

      const updatedTasks = {
        ...prev,
        [listId]: tasksArray.filter((task) => task.id !== taskId),
      };

      // Update incomplete count after deletion
      const deletedTask = tasksArray.find((task) => task.id === taskId);
      if (deletedTask && !deletedTask.checked) {
        setIncompleteCounts((prevCounts) => ({
          ...prevCounts,
          [listId]: Math.max(0, (prevCounts[listId] || 0) - 1),
        }));
      }

      // Check if the list is now empty and delete it if so
      if (updatedTasks[listId].length === 0) {
        // Remove the list from taskLists
        setTaskLists((prevTaskLists) => {
          const updatedTaskLists = { ...prevTaskLists };
          Object.keys(updatedTaskLists).forEach((date) => {
            updatedTaskLists[date] = updatedTaskLists[date].filter(
              (list) => list.id !== listId
            );
            // Remove the date if it has no lists
            if (updatedTaskLists[date].length === 0) {
              delete updatedTaskLists[date];
            }
          });
          return updatedTaskLists;
        });

        // Remove the list from tasks
        delete updatedTasks[listId];

        // Remove the list from listCategories
        setListCategories((prevCategories) => {
          const updatedCategories = { ...prevCategories };
          delete updatedCategories[listId];
          return updatedCategories;
        });

        // Remove the list from incompleteCounts
        setIncompleteCounts((prevCounts) => {
          const updatedCounts = { ...prevCounts };
          delete updatedCounts[listId];
          return updatedCounts;
        });

        // Remove the list from expandedStates
        setExpandedStates((prevStates) => {
          const updatedStates = { ...prevStates };
          delete updatedStates[listId];
          return updatedStates;
        });

        // Remove the list from tasksExpandedStates
        setTasksExpandedStates((prevStates) => {
          const updatedStates = { ...prevStates };
          delete updatedStates[listId];
          return updatedStates;
        });
      }

      return updatedTasks;
    });
  }

  function updateTaskContent(listId, taskId, newContent) {
    setTasks((prev) => ({
      ...prev,
      [listId]: (prev[listId] || []).map((task) =>
        task.id === taskId
          ? {
              ...task,
              content: newContent,
              lastEditedDate: getCurrentDateString(),
            }
          : task
      ),
    }));
  }

  function updateTaskChecked(listId, taskId, checked) {
    setTasks((prev) => ({
      ...prev,
      [listId]: (prev[listId] || []).map((task) =>
        task.id === taskId
          ? {
              ...task,
              checked: checked,
              lastEditedDate: getCurrentDateString(),
            }
          : task
      ),
    }));

    // Update incomplete count when task checked status changes
    setIncompleteCounts((prev) => {
      const currentCount = prev[listId] || 0;
      if (checked) {
        // Task was marked as done
        return {
          ...prev,
          [listId]: Math.max(0, currentCount - 1),
        };
      } else {
        // Task was marked as not done
        return {
          ...prev,
          [listId]: currentCount + 1,
        };
      }
    });
  }

  function updateTaskDueDate(listId, taskId, dueDate) {
    setTasks((prev) => ({
      ...prev,
      [listId]: (prev[listId] || []).map((task) =>
        task.id === taskId
          ? {
              ...task,
              dueDate: dueDate,
              lastEditedDate: getCurrentDateString(),
            }
          : task
      ),
    }));
  }

  function toggleCategories(listId) {
    setOpenCategories((prev) => (prev === listId ? null : listId));
  }

  function updatecategories(listId, category) {
    setListCategories((prev) => ({
      ...prev,
      [listId]: category,
    }));
    setOpenCategories(null);
  }

  // Toggle expand/collapse for all lists in a task group
  // Toggle expand/collapse for all lists in a task group
  const toggleExpandCollapse = (datestring) => {
    const listIds = taskLists[datestring]?.map((list) => list.id) || [];
    const allExpanded = listIds.every((id) => expandedStates[id]);

    const newExpandedStates = { ...expandedStates };

    listIds.forEach((id) => {
      newExpandedStates[id] = !allExpanded;
      // Don't modify tasksExpandedStates here - keep their current state
    });

    setExpandedStates(newExpandedStates);
    // Don't setTasksExpandedStates here
  };

  // Toggle expand/collapse for tasks container in a single list
  const toggleSingleTasks = (listId) => {
    setTasksExpandedStates((prev) => ({
      ...prev,
      [listId]: !prev[listId],
    }));
  };

  // Debug function to check storage
  const debugStorage = () => {
    console.log("Storage contents:");
    console.log("newTaskGroup:", loadFromStorage("newTaskGroup", []));
    console.log("taskLists:", loadFromStorage("taskLists", {}));
    console.log("tasks:", loadFromStorage("tasks", {}));
    console.log("listCategories:", loadFromStorage("listCategories", {}));
    console.log("incompleteCounts:", loadFromStorage("incompleteCounts", {}));
    console.log("expandedStates:", loadFromStorage("expandedStates", {}));
    console.log(
      "tasksExpandedStates:",
      loadFromStorage("tasksExpandedStates", {})
    );
  };

  // Clear all data
  const clearAllData = () => {
    localStorage.removeItem("newTaskGroup");
    localStorage.removeItem("taskLists");
    localStorage.removeItem("tasks");
    localStorage.removeItem("listCategories");
    localStorage.removeItem("incompleteCounts");
    localStorage.removeItem("expandedStates");
    localStorage.removeItem("tasksExpandedStates");
    setNewTaskGroup([]);
    setTaskLists({});
    setTasks({});
    setListCategories({});
    setIncompleteCounts({});
    setExpandedStates({});
    setTasksExpandedStates({});
  };

  return (
    <>
      <div className="navbar">
        <button className="addnewtaskgroupbutton" onClick={updateTaskGroup}>
          <i class="fa-solid fa-plus"></i>
        </button>
        <p
          style={{
            color: "white",
            margin: "0",
            padding: "0",
            fontFamily: "Inter, sans-serif",
            fontSize: "14px",
          }}
        >
          (Adds a daily task group)
        </p>
        {/* <button
          onClick={debugStorage}
          style={{ marginLeft: "10px", background: "blue" }}
        >
          Debug Storage
        </button>
        <button
          onClick={clearAllData}
          style={{ marginLeft: "10px", background: "red", color: "white" }}
        >
          Clear All Data
        </button> */}
      </div>

      <div ref={taskGroupContainerRef}>
        {dategroupArray.map(([datestring, groups]) => (
          <div key={datestring} className="taskgroupwrapper">
            <div className="taskgroup">
              <div className="topoflistdiv">
                <h3>{datestring}</h3>

                <button
                  className="createnewlistbtn"
                  onClick={() => updatelist(datestring)}
                >
                  <i class="fa-regular fa-square-plus"></i>
                </button>

                <button
                  className="delete-task-group-btn"
                  onClick={() => deleteTaskGroup(datestring)}
                >
                  <i class="fa-solid fa-trash-can"></i>
                </button>

                <button
                  className="collapseexpandbtn"
                  onClick={() => toggleExpandCollapse(datestring)}
                >
                  {taskLists[datestring]?.every(
                    (list) => expandedStates[list.id]
                  ) ? (
                    <i className="fa-solid fa-circle-chevron-up"></i>
                  ) : (
                    <i className="fa-solid fa-circle-chevron-down"></i>
                  )}
                </button>
              </div>

              {taskLists[datestring]?.map((list, index) => (
                <motion.div
                  key={list.id}
                  className="list"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{
                    height: expandedStates[list.id] ? "auto" : 0,
                    opacity: expandedStates[list.id] ? 1 : 0,
                  }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="list-header">
                    <div className="topdiv">
                      <button
                        className="addtaskbtn"
                        onClick={(e) => {
                          e.stopPropagation();
                          updatetask(list.id);
                        }}
                      >
                        <i class="fa-solid fa-plus"></i>
                      </button>
                      <div
                        className="categories"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCategories(list.id);
                        }}
                      >
                        {listCategories[list.id] || "categories"}
                      </div>
                      <button
                        className="expand-collapse-list-btn"
                        onClick={() => toggleSingleTasks(list.id)}
                      >
                        {tasksExpandedStates[list.id] ? (
                          <i className="fa-solid fa-circle-chevron-up"></i>
                        ) : (
                          <i className="fa-solid fa-circle-chevron-down"></i>
                        )}
                      </button>
                    </div>

                    {openCategories === list.id && (
                      <div className="dropdowndiv">
                        <p
                          onClick={() =>
                            updatecategories(list.id, "🍉 Groceries")
                          }
                        >
                          🍉 Groceries
                        </p>
                        <p
                          onClick={() =>
                            updatecategories(list.id, "🛒 Shopping")
                          }
                        >
                          🛒 Shopping
                        </p>
                        <p
                          onClick={() =>
                            updatecategories(list.id, "✨ Personal")
                          }
                        >
                          ✨ Personal
                        </p>
                        <p
                          onClick={() =>
                            updatecategories(list.id, "📝 General")
                          }
                        >
                          📝 General
                        </p>
                        <p
                          onClick={() => updatecategories(list.id, "💡 Ideas")}
                        >
                          💡 Ideas
                        </p>
                        <p
                          onClick={() =>
                            updatecategories(list.id, "📐 Project")
                          }
                        >
                          📐 Project
                        </p>
                        <p
                          onClick={() =>
                            updatecategories(list.id, "‼️ Important")
                          }
                        >
                          ‼️ Important
                        </p>
                      </div>
                    )}

                    {/* Display incomplete tasks message */}
                    <div className="task-status-message">
                      {incompleteCounts[list.id] > 0 ? (
                        <p style={{ color: "rgb(147, 145, 145)" }}>
                          ⚠️ You have {incompleteCounts[list.id]} incomplete
                          task
                          {incompleteCounts[list.id] !== 1 ? "s" : ""}
                        </p>
                      ) : (
                        tasks[list.id]?.length > 0 && (
                          <div className="smalldiv">
                            {" "}
                            <div className="small"></div>
                            <p style={{ color: "rgb(147, 145, 145)" }}>
                              All tasks completed!
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <motion.div
                    className="tasks-container"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{
                      height: tasksExpandedStates[list.id] ? "auto" : 0,
                      opacity: tasksExpandedStates[list.id] ? 1 : 0,
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    style={{ overflow: "hidden", margin: "0", padding: "0" }}
                  >
                    {tasks[list.id]?.map((task) => (
                      <div key={task.id} className="task-wrapper">
                        <Task
                          task={task}
                          onDelete={() => deleteTask(list.id, task.id)}
                          onUpdateContent={(newContent) =>
                            updateTaskContent(list.id, task.id, newContent)
                          }
                          onUpdateChecked={(checked) =>
                            updateTaskChecked(list.id, task.id, checked)
                          }
                          onUpdateDueDate={(dueDate) =>
                            updateTaskDueDate(list.id, task.id, dueDate)
                          }
                        />
                        {/* Show edited message if task was created/edited on a date after the task group date */}
                        {task.lastEditedDate &&
                          isDateAfter(task.lastEditedDate, datestring) && (
                            <div className="task-edited-message">
                              <span>Edited on {task.lastEditedDate}</span>
                            </div>
                          )}
                      </div>
                    ))}
                  </motion.div>

                  {/* Add expand/collapse buttons for individual list and tasks */}
                  <div className="list-control-buttons"></div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {dategroupArray.length === 0 && (
        <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>
          No task groups yet. Click "Add New Task Group" to get started!
        </div>
      )}
    </>
  );
}

export default App;
