import React, { useState, useEffect, useRef } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { useCountdown } from '../contexts/CountdownContext';

const CountdownTimerNode = ({ node, updateAttributes, deleteNode, editor, getPos }) => {
  const [seconds, setSeconds] = useState(node.attrs.initialSeconds || 300);
  const [isActive, setIsActive] = useState(true); // Auto-start
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const intervalRef = useRef(null);
  const taskDescription = node.attrs.taskDescription || '';
  const todoPosition = node.attrs.todoPosition || null;
  const { setActiveCountdown, clearActiveCountdown, activeCountdown } = useCountdown();
  const nodeIdRef = useRef(`countdown-${Date.now()}-${Math.random()}`);
  const isMountedRef = useRef(true);

  // Register với context khi mount
  useEffect(() => {
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
        // Clear countdownSeconds của todo parent khi cancel
        if (editor && getPos) {
          const pos = getPos()
          if (pos !== undefined) {
            const { state } = editor
            // Tìm todo item parent có countdownSeconds
            state.doc.descendants((todoNode, todoPos) => {
              if (todoNode.type.name === 'taskItem' && 
                  todoNode.attrs.countdownSeconds !== null &&
                  todoNode.content.textContent === taskDescription) {
                // Clear countdownSeconds của todo
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
        // Xóa countdown timer node
        if (deleteNode) {
          deleteNode();
        }
      },
      onPause: () => {
        setIsPaused(true);
        setIsActive(false);
      },
      onResume: () => {
        setIsPaused(false);
        setIsActive(true);
      },
      onReset: () => {
        setIsActive(false);
        setIsPaused(false);
        setIsCompleted(false);
        setSeconds(node.attrs.initialSeconds || 300);
      },
    };
    
    setActiveCountdown(countdownData);

    return () => {
      isMountedRef.current = false;
      // Clear khi unmount - chỉ clear nếu đây vẫn là active countdown
      // Sử dụng updater function pattern
      setActiveCountdown((prev) => {
        if (prev?.nodeId === currentNodeId) {
          return null; // Clear nếu đây là active countdown
        }
        return prev; // Giữ nguyên nếu không phải
      });
    };
  }, []);

  useEffect(() => {
    if (isActive && !isPaused && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds(prevSeconds => {
          if (prevSeconds <= 1) {
            setIsActive(false);
            setIsCompleted(true);
            
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

  // Update context khi state thay đổi (chỉ update nếu đây là active countdown)
  useEffect(() => {
    // Chỉ update nếu nodeId khớp hoặc activeCountdown là null (đây là countdown đầu tiên)
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
        onPause: () => {
          setIsPaused(true);
          setIsActive(false);
        },
        onResume: () => {
          setIsPaused(false);
          setIsActive(true);
        },
        onReset: () => {
          setIsActive(false);
          setIsPaused(false);
          setIsCompleted(false);
          setSeconds(node.attrs.initialSeconds || 300);
        },
      };
      
      setActiveCountdown(countdownData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, isActive, isPaused, isCompleted]);

  // Minimal indicator - chỉ hiển thị badge nhỏ
  return (
    <NodeViewWrapper>
      {/* Empty - UI hiển thị inline trong todo item thay vì ở đây */}
    </NodeViewWrapper>
  );
};

export default CountdownTimerNode;
