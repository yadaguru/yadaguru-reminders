'use strict';

var sinon = require('sinon');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var sinonChai = require('sinon-chai');
chai.use(chaiAsPromised);
chai.use(sinonChai);
chai.should();
var mockData = require('../mockData');
var config = require('../testConfig');
var dbServices;
var reminderGenerationService;
var moment = require('moment');

describe('The reminderGenerationService', function() {
  beforeEach(function(done) {
    dbServices = require('yadaguru-data')(config);
    reminderGenerationService = require('../../index')(config);
    dbServices.models.sequelize.sync({force: true})
      .then(function() {
        mockData.createMockData(dbServices.models)
          .then(function() {
            done();
          });
      });
    var todaysDate = moment.utc('2016-12-18');
    this.clock = sinon.useFakeTimers(todaysDate.valueOf());
  });

  afterEach(function() {
    this.clock.restore();
  })

  it('should get all reminders associated with a school and user', function() {
    return reminderGenerationService.getRemindersForSchool(1, 1, '2017-01-01').then(function(reminders) {
      reminders.length.should.equal(3);
      reminders.should.deep.equal([{
        schoolId: 1,
        userId: 1,
        baseReminderId: 1,
        dueDate: '2016-12-18',
        timeframe: 'Today'
      }, {
        schoolId: 1,
        userId: 1,
        baseReminderId: 1,
        dueDate: '2016-12-02',
        timeframe: '30 Days Before'
      }, {
        schoolId: 1,
        userId: 1,
        baseReminderId: 2,
        dueDate: '2017-01-01',
        timeframe: 'January 1'
      }]);
    });
  });

  it('should group and sort reminders by due date', function() {
    var reminders = [{
      id: '1',
      dueDate: '2017-02-06',
      timeframe: 'One day before',
      name: 'Write Essay',
      message: 'Better get writing!',
      detail: 'Some help for writing your essay',
      lateMessage: 'Too late',
      lateDetail: 'Should have started sooner',
      category: 'Essays',
      baseReminderId: '1',
      schoolId: '1',
      schoolName: 'Temple',
      schoolDueDate: '2017-02-07'
    }, {
      id: '2',
      dueDate: '2017-02-06',
      timeframe: 'One day before',
      name: 'Get Recommendations',
      message: 'Ask your counselor',
      detail: 'Tips for asking your counselor',
      lateMessage: 'Too late',
      lateDetail: '',
      category: 'Recommendations',
      baseReminderId: '2',
      schoolId: '1',
      schoolName: 'Temple',
      schoolDueDate: '2017-02-07'
    }, {
      id: '3',
      dueDate: '2017-01-31',
      timeframe: 'One week before',
      name: 'Complete application',
      message: 'Fill it out',
      detail: 'Do not forget anything',
      lateMessage: 'You are late!',
      lateDetail: 'Whoops',
      category: 'Application',
      baseReminderId: '3',
      schoolId: '1',
      schoolName: 'Temple',
      schoolDueDate: '2017-02-07'
    }];

    reminderGenerationService.groupAndSortByDueDate(reminders).should.deep.equal([{
      dueDate: '2017-01-31',
      reminders: [{
        id: '3',
        name: 'Complete application',
        message: 'Fill it out',
        detail: 'Do not forget anything'
      }]
    }, {
      dueDate: '2017-02-06',
      reminders: [{
        id: '1',
        name: 'Write Essay',
        message: 'Better get writing!',
        detail: 'Some help for writing your essay'
      }, {
        id: '2',
        name: 'Get Recommendations',
        message: 'Ask your counselor',
        detail: 'Tips for asking your counselor'
      }]
    }])
  });

  it('should replace variables in reminder message/details', function() {
    var reminders = [{
      id: '1',
      dueDate: '2017-02-06',
      timeframe: 'One day before',
      name: 'Write Essay',
      message: 'Better get writing!',
      detail: 'Some help for writing your %SCHOOL% essay for %SCHOOL%',
      lateMessage: 'Too late',
      lateDetail: 'Should have started sooner',
      category: 'Essays',
      baseReminderId: '1',
      schoolId: '1',
      schoolName: 'Temple',
      schoolDueDate: '2017-02-07'
    }, {
      id: '2',
      dueDate: '2017-02-06',
      timeframe: 'One day before',
      name: 'Get Recommendations',
      message: 'Ask your counselor by %REMINDER_DATE%',
      detail: 'Tips for asking your counselor',
      lateMessage: 'Too late. It is past %APPLICATION_DATE%',
      lateDetail: '',
      category: 'Recommendations',
      baseReminderId: '2',
      schoolId: '1',
      schoolName: 'Temple',
      schoolDueDate: '2017-02-07'
    }];

    reminderGenerationService.replaceVariablesInReminders(reminders).should.deep.equal([{
      id: '1',
      dueDate: '2017-02-06',
      timeframe: 'One day before',
      name: 'Write Essay',
      message: 'Better get writing!',
      detail: 'Some help for writing your Temple essay for Temple',
      lateMessage: 'Too late',
      lateDetail: 'Should have started sooner',
      category: 'Essays',
      baseReminderId: '1',
      schoolId: '1',
      schoolName: 'Temple',
      schoolDueDate: '2017-02-07'
    }, {
      id: '2',
      dueDate: '2017-02-06',
      timeframe: 'One day before',
      name: 'Get Recommendations',
      message: 'Ask your counselor by 2/6/2017',
      detail: 'Tips for asking your counselor',
      lateMessage: 'Too late. It is past 2/7/2017',
      lateDetail: '',
      category: 'Recommendations',
      baseReminderId: '2',
      schoolId: '1',
      schoolName: 'Temple',
      schoolDueDate: '2017-02-07'
    }]);
  });

  it('should deduplicate reminders', function() {
    var reminders = [{
      id: '1',
      dueDate: '2017-02-06',
      timeframe: 'One day before',
      name: 'Write Essay',
      message: 'Better get writing!',
      detail: 'Some help for writing your %SCHOOL% essay for %SCHOOL%',
      lateMessage: 'Too late',
      lateDetail: 'Should have started sooner',
      category: 'Essays',
      baseReminderId: '1',
      schoolId: '1',
      schoolName: 'Temple',
      schoolDueDate: '2017-02-07'
    }, {
      id: '2',
      dueDate: '2017-02-06',
      timeframe: 'One day before',
      name: 'Write Essay',
      message: 'Better get writing!',
      detail: 'Some help for writing your %SCHOOL% essay for %SCHOOL%',
      lateMessage: 'Too late',
      lateDetail: 'Should have started sooner',
      category: 'Essays',
      baseReminderId: '1',
      schoolId: '2',
      schoolName: 'Drexel',
      schoolDueDate: '2017-02-07'
    }, {
      id: '3',
      dueDate: '2017-02-06',
      timeframe: 'One day before',
      name: 'Write Essay',
      message: 'Better get writing!',
      detail: 'Some help for writing your %SCHOOL% essay for %SCHOOL%',
      lateMessage: 'Too late',
      lateDetail: 'Should have started sooner',
      category: 'Essays',
      baseReminderId: '1',
      schoolId: '3',
      schoolName: 'Penn',
      schoolDueDate: '2017-02-07'
    }];


    reminderGenerationService.deDuplicateReminders(reminders).should.deep.equal([{
      id: ['1', '2', '3'],
      dueDate: '2017-02-06',
      timeframe: 'One day before',
      name: 'Write Essay',
      message: 'Better get writing!',
      detail: 'Some help for writing your %SCHOOL% essay for %SCHOOL%',
      lateMessage: 'Too late',
      lateDetail: 'Should have started sooner',
      category: 'Essays',
      baseReminderId: '1',
      schoolId: ['1', '2', '3'],
      schoolName: 'Temple, Drexel, and Penn',
      schoolDueDate: '2017-02-07'
    }]);
  });

  it('should get testing reminders', function() {
    return reminderGenerationService.getTestReminders(moment.utc('2016-12-18')).then(function(reminders) {
      reminders.should.deep.equal([{
        id: 1,
        dueDate: '2017-01-01',
        name: 'SAT registration due today',
        message: 'SAT registration message',
        detail: 'SAT registration detail',
        registrationDate: '2017-01-01',
        adminDate: '2017-02-01'
      }, {
        id: 2,
        dueDate: '2017-01-15',
        name: 'ACT registration due today',
        message: 'ACT registration message',
        detail: 'ACT registration detail',
        registrationDate: '2017-01-15',
        adminDate: '2017-02-15'
      }, {
        id: 1,
        dueDate: '2017-02-01',
        name: 'SAT test today',
        message: 'SAT admin message',
        detail: 'SAT admin detail',
        registrationDate: '2017-01-01',
        adminDate: '2017-02-01'
      }, {
        id: 2,
        dueDate: '2017-02-15',
        name: 'ACT test today',
        message: 'ACT admin message',
        detail: 'ACT admin detail',
        registrationDate: '2017-01-15',
        adminDate: '2017-02-15'
      }]);
    });
  });

});
