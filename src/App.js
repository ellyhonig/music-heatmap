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

      if (response.status === 401) {
        // Token has expired or is invalid
        window.localStorage.removeItem('token');
        setToken('');
        alert('Session expired. Please log in again.');
        return;
      }

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
              artists: {},
              totalDuration: item.track.duration_ms,
            };
          } else {
            hourMap[localHour].count += 1;
            hourMap[localHour].totalDuration += item.track.duration_ms;
          }
          const songName = item.track.name;
          if (!hourMap[localHour].songs[songName]) {
            hourMap[localHour].songs[songName] = 1;
          } else {
            hourMap[localHour].songs[songName] += 1;
          }
          const artistNames = item.track.artists.map(artist => artist.name).join(', ');
          if (!hourMap[localHour].artists[artistNames]) {
            hourMap[localHour].artists[artistNames] = 1;
          } else {
            hourMap[localHour].artists[artistNames] += 1;
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
          const mostPlayedArtist = Object.keys(hourData.artists).reduce((a, b) =>
            hourData.artists[a] > hourData.artists[b] ? a : b
          );
          const uniqueSongsCount = Object.keys(hourData.songs).length;
          const uniqueArtistsCount = Object.keys(hourData.artists).length;
          const averageDuration = hourData.totalDuration / hourData.count;

          heatmapData.push({
            hour: i,
            count: hourData.count,
            mostPlayedSong: mostPlayedSong,
            mostPlayedArtist: mostPlayedArtist,
            uniqueSongsCount: uniqueSongsCount,
            uniqueArtistsCount: uniqueArtistsCount,
            averageDuration: averageDuration,
          });
        } else {
          heatmapData.push({
            hour: i,
            count: 0,
            mostPlayedSong: null,
            mostPlayedArtist: null,
            uniqueSongsCount: 0,
            uniqueArtistsCount: 0,
            averageDuration: 0,
          });
        }
      }

      setData(heatmapData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const login = () => {
    const client_id = '5822ece2416a4358bab39c7799c035d0'; // Your actual client ID
    const redirect_uri = 'http://localhost:3000/music-heatmap'; // Your actual redirect URI
    const scope = 'user-read-recently-played';
    window.location = `https://accounts.spotify.com/authorize?client_id=${client_id}&redirect_uri=${encodeURIComponent(
      redirect_uri
    )}&scope=${encodeURIComponent(
      scope
    )}&response_type=token&show_dialog=true`;
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
              const {
                hour,
                count,
                mostPlayedSong,
                mostPlayedArtist,
                uniqueSongsCount,
                uniqueArtistsCount,
                averageDuration,
              } = hourData;
              const countScale = maxCount ? Math.ceil((count / maxCount) * 4) : 0;
              const className = `hour-cell color-scale-${countScale}`;
              const displayHour = `${hour}:00 - ${hour}:59`;

              const tooltipContent =
                count > 0
                  ? `${displayHour}\nTotal plays: ${count}\nMost played song: ${mostPlayedSong}\nMost played artist: ${mostPlayedArtist}\nUnique songs: ${uniqueSongsCount}\nUnique artists: ${uniqueArtistsCount}\nAverage song duration: ${(averageDuration / 1000).toFixed(1)} seconds`
                  : `${displayHour}: No plays`;

              return (
                <div
                  key={hour}
                  className={`${className} hour-cell`}
                  id={`hour-cell-${hour}`}
                  data-tooltip-content={tooltipContent}
                >
                  {displayHour}
                </div>
              );
            })}
          </div>
          <ReactTooltip
            anchorSelect=".hour-cell"
            multiline={true}
            place="top"
          />
        </div>
      )}
    </div>
  );
}

export default App;
