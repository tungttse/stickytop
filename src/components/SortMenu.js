import React, { useState } from 'react';

const SortMenu = ({ onSort, currentSort }) => {
  const [isOpen, setIsOpen] = useState(false);

  const sortOptions = [
    { value: 'created-asc', label: 'Sort by Created (Oldest First)' },
    { value: 'created-desc', label: 'Sort by Created (Newest First)' },
    { value: 'updated-desc', label: 'Sort by Updated (Recent First)' },
    { value: 'updated-asc', label: 'Sort by Updated (Oldest First)' },
    { value: 'none', label: 'No Sorting' },
  ];

  const handleSort = (sortType) => {
    console.log('SortMenu: handleSort called with', sortType);
    onSort(sortType);
    setIsOpen(false);
  };

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('SortMenu: toggle clicked, isOpen:', isOpen);
    setIsOpen(!isOpen);
  };

  const getCurrentLabel = () => {
    const option = sortOptions.find(opt => opt.value === currentSort);
    return option ? option.label : 'Sort Nodes';
  };

  console.log('SortMenu: render, isOpen:', isOpen, 'currentSort:', currentSort);

  return (
    <div className="sort-menu-container">
      <button
        className="sort-menu-button"
        onClick={handleToggle}
        onMouseDown={(e) => e.preventDefault()}
        type="button"
      >
        <span className="sort-icon">↕</span>
        <span className="sort-label">{getCurrentLabel()}</span>
        <span className="sort-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>
      
      {isOpen && (
        <div className="sort-menu-dropdown">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              className={`sort-menu-item ${currentSort === option.value ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSort(option.value);
              }}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SortMenu;
