import React, { useState, useEffect, useRef, useCallback } from 'react';
import { debounce } from 'lodash';

const SearchBar = ({ 
  isVisible, 
  onClose, 
  onSearch, 
  onNext, 
  onPrevious, 
  currentMatch, 
  totalMatches, 
  searchQuery 
}) => {
  const [query, setQuery] = useState(searchQuery || '');
  const inputRef = useRef(null);

  // Focus input when search bar becomes visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isVisible]);

  // Update query when searchQuery prop changes
  useEffect(() => {
    setQuery(searchQuery || '');
  }, [searchQuery]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query) => {
      onSearch(query);
    }, 300),
    [onSearch]
  );

  const handleInputChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    debouncedSearch(newQuery);
  };

  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (e.shiftKey) {
          onPrevious();
        } else {
          onNext();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'F3':
        e.preventDefault();
        if (e.shiftKey) {
          onPrevious();
        } else {
          onNext();
        }
        break;
    }
  };

  const handleNext = () => {
    onNext();
  };

  const handlePrevious = () => {
    onPrevious();
  };

  if (!isVisible) return null;

  return (
    <div className="search-bar">
      <div className="search-bar-content">
        <div className="search-input-container">
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Find in document..."
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />
        </div>
        
        <div className="search-results">
          {totalMatches > 0 ? (
            <span className="search-counter">
              {currentMatch} of {totalMatches}
            </span>
          ) : query ? (
            <span className="search-counter">0 of 0</span>
          ) : null}
        </div>
        
        <div className="search-controls">
          <button
            className="search-button search-prev"
            onClick={handlePrevious}
            disabled={totalMatches === 0}
            title="Previous (Shift+Enter)"
          >
            ▲
          </button>
          <button
            className="search-button search-next"
            onClick={handleNext}
            disabled={totalMatches === 0}
            title="Next (Enter)"
          >
            ▼
          </button>
          <button
            className="search-button search-close"
            onClick={onClose}
            title="Close (Escape)"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
