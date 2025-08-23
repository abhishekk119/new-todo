import { useState, useEffect, useRef } from "react";
import "./App.css";
import Task from "./Task";

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
  const [day1, month1, year1] = date1.split('/').map(Number);
  const [day2, month2, year2] = date2.split('/').map(Number);
  
  const dateObj1 = new Date(year1, month1 - 1, day1);
  const dateObj2 = new Date(year2, month2 - 1, day2);
  
  return dateObj1 > dateObj2;
};

function App() {
  const taskGroupContainerRef = useRef(null);
  const isEditingRef = useRef(false);

  // Check for corrupted data structure
  useEffect(() => {
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
  const [taskGroupExpandedStates, setTaskGroupExpandedStates] = useState(() =>
    loadFromStorage("taskGroupExpandedStates", {})
  );

  // Save ALL data whenever ANY state changes
  useEffect(() => {
    saveToStorage("newTaskGroup", newTaskGroup);
    saveToStorage("taskLists", taskLists);
    saveToStorage("tasks", tasks);
    saveToStorage("listCategories", listCategories);
    saveToStorage("incompleteCounts", incompleteCounts);
    saveToStorage("expandedStates", expandedStates);
    saveToStorage("taskGroupExpandedStates", taskGroupExpandedStates);
  }, [
    newTaskGroup,
    taskLists,
    tasks,
    listCategories,
    incompleteCounts,
    expandedStates,
    taskGroupExpandedStates,
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
    
    // Set new task group to expanded by default
    setTaskGroupExpandedStates((prev) => ({
      ...prev,
      [taskDate]: true,
    }));
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
    const listIds = taskLists[datestring]?.map(list => list.id) || [];
    
    // Remove the task group from newTaskGroup
    setNewTaskGroup(prev => prev.filter(task => task.date !== datestring));
    
    // Remove the task group from taskLists
    setTaskLists(prev => {
      const updated = {...prev};
      delete updated[datestring];
      return updated;
    });
    
    // Remove all tasks associated with lists in this task group
    setTasks(prev => {
      const updated = {...prev};
      listIds.forEach(id => delete updated[id]);
      return updated;
    });
    
    // Remove list categories for lists in this task group
    setListCategories(prev => {
      const updated = {...prev};
      listIds.forEach(id => delete updated[id]);
      return updated;
    });
    
    // Remove incomplete counts for lists in this task group
    setIncompleteCounts(prev => {
      const updated = {...prev};
      listIds.forEach(id => delete updated[id]);
      return updated;
    });
    
    // Remove expanded states for lists in this task group
    setExpandedStates(prev => {
      const updated = {...prev};
      listIds.forEach(id => delete updated[id]);
      return updated;
    });
    
    // Remove task group expanded state
    setTaskGroupExpandedStates(prev => {
      const updated = {...prev};
      delete updated[datestring];
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
  }

  function updatetask(listId) {
    const taskTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

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

      return updatedTasks;
    });
  }

  function updateTaskContent(listId, taskId, newContent) {
    setTasks((prev) => ({
      ...prev,
      [listId]: (prev[listId] || []).map((task) =>
        task.id === taskId ? { 
          ...task, 
          content: newContent,
          lastEditedDate: getCurrentDateString()
        } : task
      ),
    }));
  }

  function updateTaskChecked(listId, taskId, checked) {
    setTasks((prev) => ({
      ...prev,
      [listId]: (prev[listId] || []).map((task) =>
        task.id === taskId ? { 
          ...task, 
          checked: checked,
          lastEditedDate: getCurrentDateString()
        } : task
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
        task.id === taskId ? { 
          ...task, 
          dueDate: dueDate,
          lastEditedDate: getCurrentDateString()
        } : task
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

  // Toggle expand/collapse for a task group
  const toggleTaskGroup = (datestring) => {
    setTaskGroupExpandedStates((prev) => ({
      ...prev,
      [datestring]: !prev[datestring],
    }));
  };

  // Toggle expand/collapse for a single list
  const toggleSingleList = (listId) => {
    setExpandedStates((prev) => ({
      ...prev,
      [listId]: !prev[listId],
    }));
  };

  return (
    <>
      <div className="navbar">
        <button className="addnewtaskgroupbutton" onClick={updateTaskGroup}>
          Add New Task Group
        </button>
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
                  New List
                </button>

                <button
                  className="collapseexpandbtn"
                  onClick={() => toggleTaskGroup(datestring)}
                >
                  {taskGroupExpandedStates[datestring] ? "Collapse" : "Expand"}
                </button>
              </div>
              
              {taskGroupExpandedStates[datestring] !== false && taskLists[datestring]?.map((list, index) => (
                <div
                  key={list.id}
                  className={`list ${expandedStates[list.id] !== false ? "expanded" : "collapsed"}`}
                >
                  <div className="topdiv">
                    <button
                      className="addtaskbtn"
                      onClick={(e) => {
                        e.stopPropagation();
                        updatetask(list.id);
                      }}
                    >
                      Add Task
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
                      className="collapse-list-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSingleList(list.id);
                      }}
                    >
                      {expandedStates[list.id] !== false ? "Collapse" : "Expand"}
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
                        onClick={() => updatecategories(list.id, "🛒 Shopping")}
                      >
                        🛒 Shopping
                      </p>
                      <p
                        onClick={() => updatecategories(list.id, "✨ Personal")}
                      >
                        ✨ Personal
                      </p>
                      <p
                        onClick={() => updatecategories(list.id, "📝 General")}
                      >
                        📝 General
                      </p>
                      <p onClick={() => updatecategories(list.id, "💡 Ideas")}>
                        💡 Ideas
                      </p>
                      <p
                        onClick={() => updatecategories(list.id, "📐 Project")}
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
                      <p style={{ color: "white" }}>
                        ⚠️ You have {incompleteCounts[list.id]} incomplete task
                        {incompleteCounts[list.id] !== 1 ? "s" : ""}
                      </p>
                    ) : (
                      tasks[list.id]?.length > 0 && (
                     <div className="smalldiv"> <div className="small"></div>
  <p style={{ color: "white" }}>
        All tasks completed! 
                        </p>
                       </div>
                      )
                    )}
                  </div>

                  {expandedStates[list.id] !== false &&
                    tasks[list.id]?.map((task) => (
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
                        {task.lastEditedDate && isDateAfter(task.lastEditedDate, datestring) && (
                          <div className="task-edited-message">
                            <span>Edited on {task.lastEditedDate}</span>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ))}
              
              {/* Delete Task Group Button */}
              <div className="delete-task-group-container">
                <button 
                  className="delete-task-group-btn"
                  onClick={() => deleteTaskGroup(datestring)}
                >
                  Delete Task Group
                </button>
              </div>
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