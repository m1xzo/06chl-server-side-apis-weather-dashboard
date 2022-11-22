// save reference to important DOM elements
var searchFormEl = $(`#search-form`);
var searchOptionEl = $(`#search-options`);
var searchHistoryEl = $(`#search-history`);
var resultContentEl = $(`#result-content`);
var msgEl = $(`#msg`);

// set default/placeholder location to San Diego
const defaultLocation = {lat:32.7174202, lon:-117.1627728};
const apiKey = `22ce281d614f9d35010a5cbbeb89ee9f`;

// Wrap all code that interacts with the DOM in a call to jQuery
$(function () {

    // Display weather of the selected city
    function displayWeather(weatherObj, cityName) {
        resultContentEl.empty();
        var currentWeatherEl = $(`<div>`).addClass(`current-content mb-3 p-2 border border-dark w-100`);
        var forecastWeatherEl = $(`<div>`).addClass(`forecast-content d-flex flex-md-row flex-column justify-content-between`);

        // the weather data updates every 3 hours, get the weather data by 24-hours interval
        for (var i = 0; i < weatherObj.length; i+=8) {          
            var cardEl = $(`<div>`).addClass(`card col-md-2 col-12 rounded-0 border-dark text-light mb-1 p-2`);
           
            // date
            var d = new Date(weatherObj[i].dt * 1000);
            var timeStamp = `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;

            // weather icon
            var iconID = weatherObj[i].weather[0].icon;
            var iconUrl = `http://openweathermap.org/img/wn/${iconID}@2x.png`;
            var iconEl = $('<img>').attr(`src`, iconUrl).addClass(`icon img-fluid`);

            // weather infos
            var TempEl = $('<div>').addClass(`py-2`).text(`Temp: ${weatherObj[i].main.temp} \u2109`);
            var windEl = $('<div>').addClass(`py-2`).text(`Wind: ${weatherObj[i].wind.speed} MPH`);
            var HumEl = $('<div>').addClass(`py-2`).text(`Humidity: ${weatherObj[i].main.humidity} %`);

            if (!i) {
                // if i is 0, add to current weather element
                var currentTitleEl = $('<div>').addClass(`d-flex flex-md-row flex-column h2 align-items-md-center`);
                currentTitleEl.text(`${cityName} (${timeStamp})`);
                currentTitleEl.append(iconEl);
                currentWeatherEl.append(currentTitleEl, TempEl, windEl, HumEl);
            } else {
                // else, add to weather forecast element
                var forecastDateEl = $('<div>').text(`${timeStamp}`);
                cardEl.append(forecastDateEl, iconEl, TempEl, windEl, HumEl);
                forecastWeatherEl.append(cardEl);
            }
        }
        var textEl = $('<div>').addClass(`h3 mb-2`).text(`5-Day Forecast:`);
        resultContentEl.append(currentWeatherEl, textEl, forecastWeatherEl);
    }

    // Search geographical location from user input
    function searchGeoApi(query) {
        var geoUrl = `http://api.openweathermap.org/geo/1.0/direct?`;
        geoUrl = `${geoUrl}q=${query}&limit=5&appid=${apiKey}`;
        fetch(geoUrl)
        .then(function (response) {
          if (!response.ok) {
              throw response.json();
          }
          return response.json();
        })
        .then(function (geoRes) {
          if (geoRes.length === 0) {
              console.log('No results found!');
              msgEl.show().text(`Unable to find the city`).fadeOut(2000);
          } else {
            // show options with similar names for user to choose from
            displayGeoOption(geoRes);
          }    
        })
        .catch(function (error) {
          console.error(error);
        });
    }

    // Search current and future weather infos for the selected location 
    function searchWeatherApi(lat, lon, cityName) { 
        var weatherUrl = `https://api.openweathermap.org/data/2.5/`;
        var currentUrl = `${weatherUrl}weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
        var forecastUrl = `${weatherUrl}forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
        var currCity = cityName;
        Promise.all([fetch(currentUrl),fetch(forecastUrl)])
          .then(function (response) {
            for (var i=0; i<response.length; i++) {
                if (!response[i].ok) {
                    throw response[i].json();
                }
            }
            return Promise.all([response[0].json(),response[1].json()]);
          })
          .then(function (data) {
            if (!data.length) {
                console.log('No results found!');
                msgEl.show().text(`No results found!`).fadeOut(2000);
            } else {
                // combine search results
                data[1].list.unshift(data[0]);
                var combinedRes = data[1].list;
                displayWeather(combinedRes, currCity);        
            }
          })
          .catch(function (error) {
            console.error(error);
          });
    } 
    
    // Read saved data from localStorage
    function readCitiesFromStorage() {
        var cities = localStorage.getItem('cities');
        // return an empty array ([]) if there aren't any citiess.
        if (cities) {
            cities = JSON.parse(cities);  
        } else {      
            cities = [];
        }
        return cities;
    }

    // Saved data to localStorage
    function saveCitiesToStorage(cities) {
        localStorage.clear();
        localStorage.setItem(`cities`, JSON.stringify(cities));
    }

    // Update new location to seach history
    function updateSearchHistory(location) {
        var cities = readCitiesFromStorage();

        for (var i = 0; i < cities.length; i++) {
            // Check for duplicated locations with same lat and lon values
            if ((cities[i].lat === location.lat) && (cities[i].lon === location.lon)) {
                // if i is 0, exit the function without making updates
                if (!i) {
                    return;
                } else {
                    cities.splice(i, 1);
                }
            }
        }
        // set the most recent searched location at the top of search history
        cities.unshift(location);
        saveCitiesToStorage(cities);
        displaySearchHistory(); 
    } 

    // Display buttons representing cities with different lat and lon value in search history
    function displaySearchHistory () {
        var cities = readCitiesFromStorage();
        // if search history is empty
        if(!cities.length) {
            // set San Diego as the defualt location
            searchWeatherApi(defaultLocation.lat, defaultLocation.lon, `San Diego`);
        } else {
            // display weather for the most recent searched city
            searchWeatherApi(cities[0].lat, cities[0].lon, cities[0].name);
        }
        
        searchHistoryEl.empty();
        for (var i=0; i < cities.length; i++) {
            var citiesBtnEl = $(`<button>`).addClass(`city-btn btn mb-3 btn-block w-100`);
            citiesBtnEl.text(cities[i].name);
            citiesBtnEl.attr(`data-lat`,cities[i].lat);
            citiesBtnEl.attr(`data-lon`,cities[i].lon);
            searchHistoryEl.append(citiesBtnEl);
        }
    }

    // Clear search history from localStorage and browser
    function clearSearchHistory(event) {
        event.preventDefault();
        localStorage.clear();
        searchHistoryEl.empty();
    }

    // Search for geographical location in the api from user input
    function handleSearchFormSubmit(event) {
        event.preventDefault();
        var userInput = $(this).children(`#search-input`).val().trim();
        $(this).children(`#search-input`).val(``);
        // display message if not receiving an input
        if (!userInput) {
            msgEl.show().text(`Please input a value!`).fadeOut(2000);
            return;
        } 
        searchGeoApi(userInput);  
    }

    // Display locations share similar names for user to choose from
    function displayGeoOption(geoSource) {
        searchOptionEl.empty();
        for (var i = 0; i < geoSource.length; i++) {
            var geoOption = $(`<button>`).addClass(`option btn my-1 btn-block w-100`);
            if (geoSource[i].state === undefined){
                geoSource[i].state = ``;
            }
            geoOption.text(`${geoSource[i].name}, ${geoSource[i].state} ${geoSource[i].country}`);
            geoOption.attr(`data-lat`,geoSource[i].lat);
            geoOption.attr(`data-lon`,geoSource[i].lon);
            searchOptionEl.append(geoOption);
        }
    }

    // Search for weather infos from selected city
    function handleSearchOption(event) {
        var latData = $(event.target).data().lat;
        var lonData = $(event.target).data().lon;
        var nameData = $(event.target).text();
        var location = {
            lat: latData,
            lon: lonData,
            name: nameData
        }
        updateSearchHistory(location);
        searchOptionEl.empty();
    }

    displaySearchHistory ();
    searchFormEl.on('submit', handleSearchFormSubmit);
    searchOptionEl.on('click', handleSearchOption);
    $(document).on(`click`, `.clear-btn`, clearSearchHistory);
    $(document).on(`click`, `.city-btn`, handleSearchOption);
});