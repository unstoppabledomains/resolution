export const abi = {
  scilla_major_version: '0',
  name: 'TestRegistrar',
  params: [],
  fields: [
    {
      name: 'registry',
      type: 'Map (ByStr32) (Record)',
    },
  ],
  transitions: [
    {
      name: 'claimZone',
      params: [
        {name: 'label', type: 'String'},
        {name: 'new_owner', type: 'ByStr20'},
      ],
    },
    {
      name: 'configureZoneResolver',
      params: [
        {name: 'name_hash', type: 'ByStr32'},
        {name: 'new_resolver', type: 'ByStr20'},
      ],
    },
    {
      name: 'configureSubzoneTTL',
      params: [
        {name: 'parent_hash', type: 'ByStr32'},
        {name: 'label_hash', type: 'ByStr32'},
        {name: 'new_ttl', type: 'Uint32'},
      ],
    },
    {
      name: 'transferZone',
      params: [
        {name: 'name_hash', type: 'ByStr32'},
        {name: 'new_owner', type: 'ByStr20'},
      ],
    },
    {
      name: 'transferSubzone',
      params: [
        {name: 'parent_hash', type: 'ByStr32'},
        {name: 'label', type: 'String'},
        {name: 'new_owner', type: 'ByStr20'},
        {name: 'new_ttl', type: 'Uint32'},
      ],
    },
  ],
  events: [
    {
      name: 'transferSubzone',
      params: [
        {name: 'parent_hash', type: 'ByStr32'},
        {name: 'label', type: 'String'},
        {name: 'owner', type: 'ByStr20'},
        {name: 'ttl', type: 'Uint32'},
      ],
    },
    {
      name: 'transferZone',
      params: [
        {name: 'name_hash', type: 'ByStr32'},
        {name: 'owner', type: 'ByStr20'},
      ],
    },
    {
      name: 'configureZoneTTL',
      params: [
        {name: 'name_hash', type: 'ByStr32'},
        {name: 'ttl', type: 'Uint32'},
      ],
    },
    {
      name: 'configureZoneResolver',
      params: [
        {name: 'name_hash', type: 'ByStr32'},
        {name: 'resolver', type: 'ByStr20'},
      ],
    },
    {
      name: 'claimZone',
      params: [
        {name: 'label', type: 'String'},
        {name: 'owner', type: 'ByStr20'},
      ],
    },
  ],
}

