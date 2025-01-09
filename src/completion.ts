import tabtab from 'tabtab';

const commands = [
  'create-task',
  'toggle',
  'track',
  'search',
  'get-entries',
  'delete'
];

tabtab.complete('redmine', (err, data) => {
  if (err || !data) {
    return;
  }

  const { line, last } = data;

  if (line.includes('redmine')) {
    return tabtab.log(commands, data, '--');
  }

  switch (last) {
    case 'create-task':
      return tabtab.log(['<taskName>', '<projectName>'], data, '--');
    case 'toggle':
      return tabtab.log(['<daysAgo>', '<totalHours>'], data, '--');
    case 'track':
      return tabtab.log(['<issueID>', '<hours>', '<comment>', '<daysAgo>'], data, '--');
    case 'search':
      return tabtab.log(['<query>'], data, '--');
    case 'get-entries':
      return tabtab.log(['<daysAgo>'], data, '--');
    case 'delete':
      return tabtab.log(['<daysAgo>'], data, '--');
    default:
      return tabtab.log(commands, data, '--');
  }
});
