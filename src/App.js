import React, { useState, useEffect } from 'react';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import './App.css';

function App() {
  const [token, setToken] = useState('');
  const [data, setData] = useState([]);

  useEffect(() => {
    const hash = window.location.hash;
    let _token = window.localStorage.getItem('token');
    if (!_token && hash) {
      _token = hash
        .substring(1)
        .split('&')
        .find(elem => elem.startsWith('access_token'))
        .split('=')[1];
      window.location.hash = '';
      window.localStorage.setItem('token', _token);
    }
    setToken(_token);
  }, []);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/me/player/recently-played?limit=50`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        console.error(`Spotify API error: ${response.statusText}`);
        return;
      }

      const result = await response.json();
      const allTracks = result.items;

      // Process the data
      const hourMap = {};

      allTracks.forEach(item => {
        const playedAt = new Date(item.played_at);
        if (playedAt >= twentyFourHoursAgo && playedAt <= now) {
          const localHour = playedAt.getHours();
          if (!hourMap[localHour]) {
            hourMap[localHour] = {
              hour: localHour,
              count: 1,
              songs: {},
            };
          } else {
            hourMap[localHour].count += 1;
          }
          const songName = item.track.name;
          if (!hourMap[localHour].songs[songName]) {
            hourMap[localHour].songs[songName] = 1;
          } else {
            hourMap[localHour].songs[songName] += 1;
          }
        }
      });

      const heatmapData = [];
      for (let i = 0; i < 24; i++) {
        const hourData = hourMap[i];
        if (hourData) {
          const mostPlayedSong = Object.keys(hourData.songs).reduce((a, b) =>
            hourData.songs[a] > hourData.songs[b] ? a : b
          );
          heatmapData.push({
            hour: i,
            count: hourData.count,
            mostPlayedSong: mostPlayedSong,
          });
        } else {
          heatmapData.push({
            hour: i,
            count: 0,
            mostPlayedSong: null,
          });
        }
      }

      setData(heatmapData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const login = () => {
    const client_id = 'YOUR_SPOTIFY_CLIENT_ID'; // Replace with your Spotify client ID
    const redirect_uri = 'http://localhost:3000'; // Ensure this matches your Spotify app's redirect URI
    const scope = 'user-read-recently-played';
    window.location = `https://accounts.spotify.com/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&scope=${scope}&response_type=token&show_dialog=true`;
  };

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="App">
      {!token ? (
        <button onClick={login}>Login to Spotify</button>
      ) : (
        <div>
          <h1>Music Listening Heatmap (Last 24 Hours)</h1>
          <div className="hour-grid">
            {data.map(hourData => {
              const { hour, count, mostPlayedSong } = hourData;
              const countScale = maxCount ? Math.ceil((count / maxCount) * 4) : 0;
              const className = `hour-cell color-scale-${countScale}`;
              const displayHour = `${hour}:00 - ${hour}:59`;

              return (
                <div
                  key={hour}
                  className={className}
                  data-tip={
                    count > 0
                      ? `${displayHour}: ${count} plays, Most played song: ${mostPlayedSong}`
                      : `${displayHour}: No plays`
                  }
                >
                  {displayHour}
                </div>
              );
            })}
          </div>
          <ReactTooltip />
        </div>
      )}
    </div>
  );
}

export default App;
