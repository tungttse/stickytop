// import React, { useState, useRef, useEffect } from 'react';

// const FilterMenu = ({ onFilterChange, currentFilter }) => {
//   const [isOpen, setIsOpen] = useState(false);
//   const dropdownRef = useRef(null);

//   const filterOptions = [
//     { value: 'all', label: 'All' },
//     { value: 'todo-only', label: 'Todo only' },
//     { value: 'completed-only', label: 'Completed only' },
//     { value: 'incomplete-only', label: 'Incomplete only' }
//   ];

//   const currentOption = filterOptions.find(option => option.value === currentFilter) || filterOptions[0];

//   // Close dropdown when clicking outside
//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
//         setIsOpen(false);
//       }
//     };

//     document.addEventListener('mousedown', handleClickOutside);
//     return () => {
//       document.removeEventListener('mousedown', handleClickOutside);
//     };
//   }, []);

//   const handleFilterSelect = (filterValue) => {
//     onFilterChange(filterValue);
//     setIsOpen(false);
//   };

//   return (
//     <div className="filter-menu" ref={dropdownRef}>
//       <button
//         className="filter-button"
//         onClick={(e) => {
//           e.preventDefault();
//           e.stopPropagation();
//           setIsOpen(!isOpen);
//         }}
//         onMouseDown={(e) => {
//           e.preventDefault();
//         }}
//         type="button"
//       >
//         <span className="filter-button-text">
//           Filter: {currentOption.label}
//         </span>
//         <span className="filter-button-arrow">
//           {isOpen ? '▲' : '▼'}
//         </span>
//       </button>

//       {isOpen && (
//         <div className="filter-dropdown">
//           {filterOptions.map((option) => (
//             <div
//               key={option.value}
//               className={`filter-option ${currentFilter === option.value ? 'active' : ''}`}
//               onClick={(e) => {
//                 e.preventDefault();
//                 e.stopPropagation();
//                 handleFilterSelect(option.value);
//               }}
//             >
//               {option.label}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// export default FilterMenu;
