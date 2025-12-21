import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { useCountdown } from '../../contexts/CountdownContext';

const CountdownTimerNode = ({ node, deleteNode, editor }) => {
  const { initialSeconds = 300, taskDescription = '', todoPosition = null } = node.attrs;
  
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const intervalRef = useRef(null);
  const nodeIdRef = useRef(`countdown-${Date.now()}-${Math.random()}`);
  const isMountedRef = useRef(true);
  
  const { setActiveCountdown, activeCountdown } = useCountdown();

  // Clear todo's countdownSeconds attribute
  const clearTodoCountdown = useCallback(() => {
    if (!editor || todoPosition === null) return;
    
    try {
      const { state } = editor;
      const todoNode = state.doc.nodeAt(todoPosition);
      if (todoNode?.type.name === 'taskItem' && todoNode.attrs.countdownSeconds !== null) {
        const tr = state.tr;
        tr.setNodeMarkup(todoPosition, null, {
          ...todoNode.attrs,
          countdownSeconds: null,
        });
        editor.view.dispatch(tr);
      }
    } catch (error) {
      console.warn('Error clearing todo countdownSeconds:', error);
    }
  }, [editor, todoPosition]);

  // Handle cancel - clears todo and deletes node
  const handleCancel = useCallback(() => {
    clearTodoCountdown();
    deleteNode?.();
  }, [clearTodoCountdown, deleteNode]);

  // Handle timer completion - auto-check task, show notification, play sound
  const handleComplete = useCallback(() => {
    // Auto-check task item
    if (editor && todoPosition !== null) {
      try {
        const { state } = editor;
        const taskItemNode = state.doc.nodeAt(todoPosition);
        
        if (taskItemNode?.type.name === 'taskItem' && !taskItemNode.attrs.checked) {
          const tr = state.tr;
          tr.setNodeMarkup(todoPosition, null, {
            ...taskItemNode.attrs,
            checked: true,
          });
          editor.view.dispatch(tr);
        }
      } catch (error) {
        console.warn('Error auto-checking task item:', error);
      }
    }
    
    // Show notification
    window.electronAPI?.showNotification?.({
      title: "⏰ StickyTop Timer",
      body: taskDescription ? `Task completed: ${taskDescription}` : "Countdown completed!",
      sound: true
    });
    
    // Play system sound (3 times for emphasis)
    if (window.electronAPI?.playSystemSound) {
      window.electronAPI.playSystemSound('Glass');
      window.electronAPI.playSystemSound('Glass');
      window.electronAPI.playSystemSound('Glass');
    }
  }, [editor, todoPosition, taskDescription]);

  // Build countdown data object for context
  const buildCountdownData = useCallback(() => ({
    nodeId: nodeIdRef.current,
    initialSeconds,
    taskDescription,
    todoPosition,
    seconds,
    isActive,
    isCompleted,
    onStateUpdate: (newState) => {
      if (isMountedRef.current) {
        setSeconds(newState.seconds);
        setIsActive(newState.isActive);
        setIsCompleted(newState.isCompleted);
      }
    },
    onCancel: handleCancel,
  }), [initialSeconds, taskDescription, todoPosition, seconds, isActive, isCompleted, handleCancel]);

  // Register with context when active
  useEffect(() => {
    if (!isActive) return;
    
    isMountedRef.current = true;
    const currentNodeId = nodeIdRef.current;
    
    setActiveCountdown(buildCountdownData());

    return () => {
      isMountedRef.current = false;
      setActiveCountdown(prev => prev?.nodeId === currentNodeId ? null : prev);
    };
  }, [isActive, buildCountdownData, setActiveCountdown]);

  // Timer interval
  useEffect(() => {
    if (!isActive || isCompleted) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          setIsActive(false);
          setIsCompleted(true);
          handleComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, isCompleted, handleComplete]);

  // Update context when state changes
  useEffect(() => {
    const isThisActive = !activeCountdown || activeCountdown.nodeId === nodeIdRef.current;
    
    if (isThisActive && isActive) {
      setActiveCountdown(buildCountdownData());
    }
  }, [seconds, isActive, isCompleted, activeCountdown, buildCountdownData, setActiveCountdown]);

  return (
    <NodeViewWrapper>
      {/* Empty - UI displays inline in todo item instead of here */}
    </NodeViewWrapper>
  );
};

export default CountdownTimerNode;
