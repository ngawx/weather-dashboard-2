import React, { useEffect, useState } from 'react';
import './ConditionsScroll.css';

const cities = [
  { name: 'Atlanta, GA', grid: ['FFC', '57', '100'] },
  { name: 'Athens, GA', grid: ['FFC', '75', '89'] },
  { name: 'Dalton, GA', grid: ['FFC', '38', '140'] },
  { name: 'Rome, GA', grid: ['FFC', '27', '114'] },
  { name: 'Gainesville, GA', grid: ['FFC', '65', '108'] },
  { name: 'Peachtree City, GA', grid: ['FFC', '56', '83'] },
];

export default function ConditionsScroll() {
  const [index, setIndex] = useState(0);
  const [data, setData] = useState([]);

  const toFahrenheit = (celsius) => Math.round((celsius * 9) / 5 + 32);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const results = await P
