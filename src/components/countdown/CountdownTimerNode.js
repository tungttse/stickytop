import React, { useState, useEffect, useRef } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { useCountdown } from '../../contexts/CountdownContext';

const CountdownTimerNode = ({ node, updateAttributes, deleteNode, editor, getPos }) => {
  const [seconds, setSeconds] = useState(node.attrs.initialSeconds || 300);
  const [isActive, setIsActive] = useState(false); // Auto-start
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const intervalRef = useRef(null);
  const taskDescription = node.attrs.taskDescription || '';
  const todoPosition = node.attrs.todoPosition || null;
  const { setActiveCountdown, clearActiveCountdown, activeCountdown } = useCountdown();
  const nodeIdRef = useRef(`countdown-${Date.now()}-${Math.random()}`);
  const isMountedRef = useRef(true);

  // Register with context when mount - only when isActive = true
  useEffect(() => {
    // Only register if countdown is active
    if (!isActive) {
      return;
    }
    
    isMountedRef.current = true;
    const currentNodeId = nodeIdRef.current;
    
    const countdownData = {
      nodeId: currentNodeId,
      initialSeconds: node.attrs.initialSeconds || 300,
      taskDescription,
      todoPosition,
      seconds,
      isActive,
      isPaused,
      isCompleted,
      onStateUpdate: (newState) => {
        if (isMountedRef.current) {
          setSeconds(newState.seconds);
          setIsActive(newState.isActive);
          setIsPaused(newState.isPaused);
          setIsCompleted(newState.isCompleted);
        }
      },
      onCancel: () => {
        // Clear countdownSeconds of todo parent when cancel
        if (editor && getPos) {
          const pos = getPos()
          if (pos !== undefined) {
            const { state } = editor
            // Find todo item parent that has countdownSeconds
            state.doc.descendants((todoNode, todoPos) => {
              if (todoNode.type.name === 'taskItem' && 
                  todoNode.attrs.countdownSeconds !== null &&
                  todoNode.content.textContent === taskDescription) {
                // Clear countdownSeconds of todo
                const tr = state.tr
                tr.setNodeMarkup(todoPos, null, {
                  ...todoNode.attrs,
                  countdownSeconds: null,
                })
                editor.view.dispatch(tr)
              }
            })
          }
        }
        // Delete countdown timer node
        if (deleteNode) {
          deleteNode();
        }
      },
    };
    
    setActiveCountdown(countdownData);

    return () => {
      isMountedRef.current = false;
      setActiveCountdown((prev) => {
        if (prev?.nodeId === currentNodeId) {
          return null;
        }
        return prev;
      });
    };
  }, [isActive]); // Add isActive as dependency

  useEffect(() => {
    if (isActive && !isPaused && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds(prevSeconds => {
          if (prevSeconds <= 1) {
            setIsActive(false);
            setIsCompleted(true);
            
            // Auto-check task item when countdown completes
            if (editor && todoPosition !== null && todoPosition !== undefined) {
              try {
                const { state } = editor;
                const tr = state.tr;
                
                // Find task item at todoPosition
                let taskItemPos = null;
                state.doc.descendants((node, pos) => {
                  if (node.type.name === 'taskItem' && 
                      pos === todoPosition &&
                      !node.attrs.checked) {
                    taskItemPos = pos;
                    return false; // Stop searching
                  }
                  return true;
                });
                
                if (taskItemPos !== null) {
                  // Check task item
                  const taskItemNode = state.doc.nodeAt(taskItemPos);
                  if (taskItemNode && !taskItemNode.attrs.checked) {
                    tr.setNodeMarkup(taskItemPos, null, {
                      ...taskItemNode.attrs,
                      checked: true,
                    });
                    editor.view.dispatch(tr);
                  }
                }
              } catch (error) {
                console.warn('Error auto-checking task item:', error);
              }
            }
            
            // Show notification
            if (window.electronAPI && window.electronAPI.showNotification) {
              window.electronAPI.showNotification({
                title: "⏰ StickyTop Timer",
                body: taskDescription ? `Task completed: ${taskDescription}` : "Countdown completed!",
                sound: true
              });
            }
            
            // Play system sound
            if (window.electronAPI && window.electronAPI.playSystemSound) {
              window.electronAPI.playSystemSound('Glass');
              window.electronAPI.playSystemSound('Glass');
              window.electronAPI.playSystemSound('Glass');
            }
            
            return 0;
          }
          return prevSeconds - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, isPaused, seconds, taskDescription]);

  // Update context when state changes (only update if this is the active countdown)
  useEffect(() => {
    // Only update if countdown is active
  
    // Only update if nodeId matches or activeCountdown is null (this is the first countdown)
    const isThisActive = !activeCountdown || activeCountdown.nodeId === nodeIdRef.current;
    
    if (isThisActive) {
      const countdownData = {
        nodeId: nodeIdRef.current,
        initialSeconds: node.attrs.initialSeconds || 300,
        taskDescription,
        todoPosition,
        seconds,
        isActive,
        isPaused,
        isCompleted,
        onStateUpdate: (newState) => {
          setSeconds(newState.seconds);
          setIsActive(newState.isActive);
          setIsPaused(newState.isPaused);
          setIsCompleted(newState.isCompleted);
        },
        onCancel: () => {
          if (deleteNode) {
            deleteNode();
          }
        },
      };
      
      setActiveCountdown(countdownData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, isActive, isPaused, isCompleted]);

  // Minimal indicator - only display small badge
  return (
    <NodeViewWrapper>
      {/* Empty - UI displays inline in todo item instead of here */}
    </NodeViewWrapper>
  );
};

export default CountdownTimerNode;
