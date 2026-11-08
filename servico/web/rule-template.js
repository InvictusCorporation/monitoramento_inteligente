(() => {
  window.InvictusRuleTemplate=(source,destination)=>({
    name:source.name,enabled:false,priority:source.priority,days:[...source.days],
    start:source.start,end:source.end,timezone:source.timezone,
    targets:[...(source.targets||[source.target||'person'])],
    area:{x:0,y:0,width:100,height:100},version:destination?.version||0
  });
})();
