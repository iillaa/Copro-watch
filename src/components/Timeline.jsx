
import React from 'react';
import { FaBriefcaseMedical, FaFileMedicalAlt } from 'react-icons/fa';

const eventIcons = {
  exam: <FaBriefcaseMedical />,
  generic: <FaFileMedicalAlt />,
};

export default function Timeline({ events }) {
  if (!events || events.length === 0) {
    return <p>Aucun événement à afficher.</p>;
  }

  return (
    <div className="timeline-container">
      {events.map((event, index) => (
        <div key={index} className="timeline-item">
          <div className="timeline-icon">{eventIcons[event.type] || eventIcons.generic}</div>
          <div className="timeline-content">
            <div className="timeline-date">{event.date}</div>
            <div className="timeline-title">{event.title}</div>
            <div className="timeline-description">{event.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
