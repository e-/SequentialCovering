var log2 = Math.log2,
    gainThreshold = 5;

function removeA(arr) { // http://stackoverflow.com/questions/3954438/remove-item-from-array-by-value
    var what, a = arguments, L = a.length, ax;
    while (L > 1 && arr.length) {
        what = a[--L];
        while ((ax= arr.indexOf(what)) !== -1) {
            arr.splice(ax, 1);
        }
    }
    return arr;
}

function ruleToString(rule){
  return rule.map(function(test){
    return '(' + test[0] + ' = ' + test[1] + ')';
  }).join(' and ');
}

function getSatisfied(data, rule) {
  return data.filter(function(d){
    var flag = true;
    rule.forEach(function(test){
      if(d[test[0]] != test[1])
        flag = false;
    });
    return flag;
  });
}

function getPos(data, rule, whichAttribute, whatValue) {
  return getSatisfied(data, rule).filter(function(d){
    return d[whichAttribute] == whatValue;
  });
}

function getNeg(data, rule, whichAttribute, whatValue) {
  return getSatisfied(data, rule).filter(function(d){
    return d[whichAttribute] != whatValue;
  });
}

function isAlreadyUsed(rule, attribute){
  var flag = false;
  rule.forEach(function(test){
    if(test[0] == attribute)
      flag = true;
  });
  return flag;
}

function learnOneRule(data, possibleValues, whichAttribute, whatValue){
  var N = data.length,
      rule = [], //initial rule is empty
      pos,
      neg;

  pos = data.filter(function(d){return d[whichAttribute] == whatValue;}).length;
  neg = N - pos;
  
  do {
    var maxGain = -1,
        maxRule;
        
    possibleValues.forEach(function(values, attribute){
      if(attribute == whichAttribute || isAlreadyUsed(rule, attribute)) {
        // we do not consider the attribute that we want to classify
        return;
      }
      
      values.forEach(function(value){ // the case when we add a new test (attribute = value) to the rule
        var newTest = [attribute, value],
            newRule = rule.slice(0),
            newPos,
            newNeg, 
            gain;

        newRule.push(newTest);
        newPos = getPos(data, newRule, whichAttribute, whatValue).length;
        newNeg = getNeg(data, newRule, whichAttribute, whatValue).length;
        gain = newPos * (log2(newPos / (newPos + newNeg)) - log2(pos / (pos + neg)));
        
        if(maxGain < gain) {
          maxGain = gain;
          maxRule = newRule;
        }
      });
    });
     
    if(maxGain < gainThreshold) break;
    rule = maxRule;
    pos = getPos(data, rule, whichAttribute, whatValue).length;
    neg = getNeg(data, rule, whichAttribute, whatValue).length;
  } while(true);
  
  return rule;
}

function log(str){
  $('#log').append('<div>' + str + '</div>');
}

function isSatisfied(rule, d){
  var flag = true;
  rule.forEach(function(test){
    if(d[test[0]] != test[1])
      flag = false;
  });
  return flag;
}

function sc(data, whichAttribute){
  var N = data.length,
      attrN = data[0].length,
      rawData = data.slice(0),
      possibleValues = [],
      i, j,
      rules = [];
  
  for(i = 0 ; i < attrN; ++i) possibleValues.push([]);

  // collect all possible values from data
  for(i = 0; i < N; ++i){
    for(j = 0 ; j < attrN; ++j){
      if(!data[i][j] || data[i][j].trim().length == 0)continue;
      if(possibleValues[j].indexOf(data[i][j]) < 0) // if absent
        possibleValues[j].push(data[i][j]); // add
    }
  }
  possibleValues[whichAttribute].forEach(function(whatValue, i){
    do{
      var rule = learnOneRule(data, possibleValues, whichAttribute, whatValue),
          correct = getPos(data, rule, whichAttribute, whatValue);
 
      if(rule.length == 0)
        break;
      
      rules.push([
        rule,
        whatValue,
        0
      ]);
      // remove correct 
      correct.forEach(function(c){
        removeA(data, c);
      });

      log('if ' + ruleToString(rule) + ' then ' + ruleToString([[whichAttribute, whatValue]]));
    } while(true);
  });

  rules.push([
    [],
    possibleValues[whichAttribute][possibleValues[whichAttribute].length - 1],
    0
  ]);
  log('else ' + ruleToString([[whichAttribute, possibleValues[whichAttribute][possibleValues[whichAttribute].length - 1]]]));

  log(rules.length + ' in total');
  
  var correct = 0;
  rawData.forEach(function(d){
    var i;
    
    for(i = 0; i < rules.length; ++i){
      if(isSatisfied(rules[i][0], d)) {
        rules[i][2]++;
        if(d[whichAttribute] == rules[i][1])
          correct++;
        break;
      }
    }
  });
    
  log('<h2>Accuracy</h2>');
  log(correct + ' / ' + rawData.length);
  rules.forEach(function(rule){
      log(rule[2] + ' row(s) satisfy if ' + ruleToString(rule[0]) + ' then ' + ruleToString([[whichAttribute, rule[1]]]));
  });

  return rules;
}

function classify(path, whichAttribute){
  var data = [];
  $('#log').empty();

  $.get(path, function(csv){
    $('#log').append('<h2>Raw Data</h2><div>'+csv.replace(/\n/g,'<br />')+'</div><h2>Rules</h2>');
    csv.split('\n').filter(function(line){return line.trim().length > 0;}).forEach(function(line){
      var instance = [];
      line.split(',').forEach(function(value){
        instance.push(value);
      });
      data.push(instance);
    });
    
    sc(data, whichAttribute);
  });
}

$(function(){
  $('#form').submit(function(){
    var dataset = $('#dataset').val().trim(),
        attribute = parseInt($('#attribute').val().trim());

    gainThreshold = parseFloat($('#gain').val().trim());

    if(isNaN(attribute)) {
      alert('Please enter the index of an attribute');
      return false;
    }

    if(isNaN(gainThreshold)) {
      alert('Please enter the stop condition');
      return false;
    }

    classify(dataset, attribute);

    return false;
  });
});
