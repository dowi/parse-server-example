var jssha = require('./jssha256.js');
 
Parse.Cloud.job("DeleteMellanoxLog", function(request, response) {
 
    var d = new Date();
    var dayOfWeek = d.getDay();
    if(dayOfWeek != 0) return;
 
    var Log = Parse.Object.extend("Log");
    var query = new Parse.Query(Log);
    query.equalTo("domain", "mellanox.com");
    query.find({
    success: function(logs) {
            Parse.Object.destroyAll(logs).then(function() {
                    status.success("success");
            });
    },
    error: function(error) {
        status.error("Error finding posts " + error.code + ": " + error.message);
    }
    });
});
 
Parse.Cloud.job("ReportByEmail", function(request, response) {
    var d = new Date();
    var dayOfWeek = d.getDay();
    if(dayOfWeek >= 5)
    {
        response.success("weekend");
        return;
    }
 
  var Mandrill = require('mandrill');
//  Mandrill.initialize('g04FIksqdCzLoWVrLQaBkw');
    Mandrill.initialize('7CRiepcoBMaYk7diblRIfQ');
     
    var Log = Parse.Object.extend("Log");
    var query = new Parse.Query(Log);
    query.equalTo("domain", "mellanox.com");
    query.startsWith("what", "Book room successful");
    query.limit(1000);
    query.find({
      success: function(results) {
 
                results.reverse();
        resultsText = "";
        for (var i = 0; i < results.length; i++) {
          var object = results[i];
          var what = object.get("what");
          var what_split = what.split(",");
          var room_name = "";
          if(what_split.length > 1)
          {
              room_name = what_split[1];
          }
          resultsText = resultsText + "\n" + object.createdAt.toString().split(" ").join() + "," + object.get("who") + "," + room_name;
        }
 
        Mandrill.sendEmail({
            message: {
              text: "Number of bookings: " + results.length + "\n" + resultsText,
              subject: "Room finder report",
              from_email: "dowi84@gmail.com",
              from_name: "Room finder",
              to: [
                {
                  email: "zache@mellanox.com",
                  name: "zache"
                },
                {
                  email: "dowi84@gmail.com",
                  name: "dovi"
                }
              ]
            },
            async: true
          },{
            success: function(httpResponse) {
              console.log(httpResponse);
              response.success("Email sent!");
            },
            error: function(httpResponse) {
              console.error(httpResponse);
              response.error("Uh oh, something went wrong");
            }
          });
      },
      error: function(error) {
        alert("Error: " + error.code + " " + error.message);
      }
    });
 
 
 
});
 
 
Parse.Cloud.define("GetDataForEmail", function(request, response)
{
    var userEmail = request.params.email.toLowerCase();
    var emailParts = userEmail.split("@");
    var emailLeftPart = emailParts[0];
    var userDomain = emailParts[1];
 
 
    //find user
 
    var queryEmail = new Parse.Query("Users");
    queryEmail.equalTo("email", request.params.email.toLowerCase());
 
    var hashed_email = jssha.HMAC_SHA256_MAC("asdqweasd", emailLeftPart);
    var queryHashedEmail = new Parse.Query("Users");
    queryHashedEmail.equalTo("email", hashed_email + "@" + userDomain);
 
    var mainQuery = Parse.Query.or(queryEmail, queryHashedEmail);
  mainQuery.first({
        success: function(object)
        {
            if (object != undefined)
            {
                passwordKey = object.get("passwordKey");
                var query = new Parse.Query("Domains");
                query.equalTo("name", userDomain);
                query.first({
                   success: function(object)
                   {
                        if (object != undefined) //domain  exists
                        {
                            response.success({"reportIssueEmail": object.get("reportIssueEmail"),
                                                "passwordKey" : passwordKey});
                            return;
                        }
 
                        //***domain does not exists***
                        response.success({"reportIssueEmail": "",
                                                "passwordKey" : passwordKey});
                        //response.error("domain does not exists " + userDomain);
 
 
                   },
                   error: function(error)
                   {
                            response.error("try again");
                            return;
                   }
                });
            }
            else
            {
               //***user does not exists***
               response.error("no user");
            }
 
 
        },
        error: function(error)
        {
           response.error("try again");
           return;
        }
    });
 
});
 
Parse.Cloud.define("AddOneYearForAUser", function(request, response) {
 
    var userEmail = request.params.email.toLowerCase();
    var emailParts = userEmail.split("@");
    var emailLeftPart = emailParts[0];
    var userDomain = emailParts[1];
 
   var queryEmail = new Parse.Query("Users");
   queryEmail.equalTo("email", request.params.email.toLowerCase());
 
     var hashed_email = jssha.HMAC_SHA256_MAC("asdqweasd", emailLeftPart);
     var queryHashedEmail = new Parse.Query("Users");
     queryHashedEmail.equalTo("email", hashed_email + "@" + userDomain);
 
     var mainQuery = Parse.Query.or(queryEmail, queryHashedEmail);
   mainQuery.first({
                               success: function(object)
                               {
                                    if (object != undefined) //user  exists
                                    {
                                        var nextYearDate = object.get("expirationDate");
                                        var currentDate = new Date();
                                        if(nextYearDate === undefined)
                                            nextYearDate = currentDate;
                                        if(currentDate > nextYearDate)//take the last date
                                            nextYearDate = currentDate;
 
                                        nextYearDate.setMonth(nextYearDate.getMonth() + 12);
 
                                        object.set("expirationDate", nextYearDate);
                                        object.set("standaloneUser", true)
                                        object.save();
 
                                        response.success();
                                        return;
                                    }
                                    else
                                    {
                                        //***user does not exists***
                                        response.error("user does not exists");
                                    }
 
                               },
                               error: function(error) {
                                    response.error("try again");
                                    return;
 
                               }
                               });
});
 
Parse.Cloud.define("GetExpirationDateForEmail", function(request, response) {
 
    var userEmail = request.params.email.toLowerCase();
    var emailParts = userEmail.split("@");
    var emailLeftPart = emailParts[0];
    var userDomain = emailParts[1];
 
    var queryEmail = new Parse.Query("Users");
    queryEmail.equalTo("email", request.params.email.toLowerCase());
 
    var hashed_email = jssha.HMAC_SHA256_MAC("asdqweasd", emailLeftPart);
    var queryHashedEmail = new Parse.Query("Users");
    queryHashedEmail.equalTo("email", hashed_email + "@" + userDomain);
 
    var mainQuery = Parse.Query.or(queryEmail, queryHashedEmail);
    mainQuery.first({
               success: function(object)
               {
               if (object != undefined) //user  exists
               {
                    if(object.get("standaloneUser") == true)
                    {
                        response.success(object.get("expirationDate"));
                        return;
                    }
                    else
                    {
                        var newUserEmail = object.get("email").toLowerCase();
                        var emailParts = newUserEmail.split("@");
                        var userDomain = emailParts[1];
 
                        var query = new Parse.Query("Domains");
                        query.equalTo("name", userDomain);
                        query.first({
                           success: function(object)
                           {
                                    if (object != undefined) //domain  exists
                                    {
                                        response.success(object.get("expirationDate"));
                                        return;
                                    }
 
                                    //***domain does not exists***
                                    response.error("domain does not exists " + userDomain);
 
 
                           },
                           error: function(error) {
                                    response.error("try again");
                                    return;
 
                           }
                           });
 
 
                    }
               }
               else
               {
                    //***user does not exists***
                    response.error("user does not exists");
               }
 
               },
               error: function(error) {
                    response.error("try again");
                    return;
 
               }
               });
});
 
Parse.Cloud.beforeSave("Users", function(request, response)
{
                       if(request.object.isNew() == false)
                       {
                            response.success();
                            return;
                       }
 
 
                       var newUserEmail = request.object.get("email").toLowerCase();
                       var emailParts = newUserEmail.split("@");
                       var emailLeftPart = emailParts[0];
                       var userDomain = emailParts[1];
 
                                             var hashed_email = jssha.HMAC_SHA256_MAC("asdqweasd", emailLeftPart);
                                             if(userDomain == "mellanox.com" || userDomain == "myfriends.co.il")
                                             {
                                                    request.object.set("email", hashed_email + "@" + userDomain);
                                             }
 
                       //finding if user already exists
                                                var queryEmail = new Parse.Query("Users");
                                                queryEmail.equalTo("email", newUserEmail);
 
                                                var queryHashedEmail = new Parse.Query("Users");
                                                queryHashedEmail.equalTo("email", hashed_email + "@" + userDomain);
 
                                                var mainQuery = Parse.Query.or(queryEmail, queryHashedEmail);
                        mainQuery.first({
                                success: function(object)
                                {
                                    if (object != undefined)
                                    {
                                        response.error("user already exists");
                                        return; //user already exists
                                    }
 
                                   //***user does not exists***
 
                                   //saving the password encryption key
                                    var passwordKey = "";
                                                                        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
 
                                                                        for( var i = 0; i < 10; i++ )
                                                                            passwordKey += possible.charAt(Math.floor(Math.random() * possible.length));
 
                                    request.object.set("passwordKey", passwordKey);
 
 
                                       //if user just bought a subscription - save it
                                       if(request.object.get("standaloneUser") == true)
                                       {
                                            var nextYearDate = new Date();
                                            nextYearDate.setMonth(nextYearDate.getMonth() + 12);
 
                                            request.object.set("expirationDate", nextYearDate);
 
                                            response.success();
                                            return;
                                       }
 
                                       //see if he is part of a domain that bought and has enough users left
                                       var Domains = Parse.Object.extend("Domains");
                                       var query = new Parse.Query(Domains);
                                       query.equalTo("name", userDomain);
                                       query.first({
                                               success: function(object) {
                                               // Successfully retrieved the object.
 
                                               if(object == undefined)
                                               {
                                                    response.error("domain does not exists");
                                                    return;
                                               }
 
                                               //domain exists. count it
                                               var Users = Parse.Object.extend("Users");
                                               var query = new Parse.Query(Users);
                                               query.endsWith("email", userDomain);
                                               query.count({
                                                        success: function(count) {
                                                           // The count request succeeded. Show the count
                                                           if(count < object.get("countBought")) //object here is the domain object
                                                           {
                                                                response.success();
                                                                return;
                                                           }
                                                           else
                                                           {
                                                                response.error("domain is full");
                                                                return;
                                                           }
 
                                                        },
                                                        error: function(error) {
                                                        // The request failed
                                                            response.error("try again 1");
                                                           return;
                                                        }
                                                        });
                                               },
                                               error: function(error) {
                                                    response.error("try again 2");
                                                    return;
                                               }
                                               });
                                },
                                error: function(error) {
                                   response.error(error.code + ":" + error.message + " try again 3");
                                   return;
 
                                }
                                });
 
});