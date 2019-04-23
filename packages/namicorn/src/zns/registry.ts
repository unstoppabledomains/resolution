export const address = '9f01ae18d3f44aaa700207a2384608a808b3285a'

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

export const createInit = (_scilla_version = abi.scilla_major_version) => [
  {
    name: '_scilla_version',
    type: 'Uint32',
    value: String(_scilla_version),
  },
]

export const code = `scilla_version 0

import BoolUtils

library TestRegistrar

let null_address = 0x0000000000000000000000000000000000000000
let timestamp_zero = Uint32 0
let null_hash = 0x0000000000000000000000000000000000000000000000000000000000000000

let one_msg =
  fun (msg : Message) =>
  let nil_msg = Nil {Message} in
  Cons {Message} msg nil_msg

type Record =
| Record of ByStr20 ByStr20   ByStr20  Uint32
         (* Owner   PrevOwner Resolver TTL *)

let get_record_owner =
  fun (record_option: Option (Record)) =>
    match record_option with
    | Some record =>
      match record with
      | Record owner prev_owner resolver ttl =>
        owner
      end
    | None =>
      null_address
    end

let get_record_prev_owner =
  fun (record_option: Option (Record)) =>
    match record_option with
    | Some record =>
      match record with
      | Record owner prev_owner resolver ttl =>
        prev_owner
      end
    | None =>
      null_address
    end

let get_record_resolver =
  fun (record_option: Option (Record)) =>
    match record_option with
    | Some record =>
      match record with
      | Record owner prev_owner resolver ttl =>
        resolver
      end
    | None =>
      null_address
    end

let get_record_ttl =
  fun (record_option: Option (Record)) =>
    match record_option with
    | Some record =>
      match record with
      | Record owner prev_owner resolver ttl =>
        ttl
      end
    | None =>
      timestamp_zero
    end

contract TestRegistrar ()

field registry : Map (ByStr32) (Record)
               = Emp (ByStr32) (Record)

transition claimZone (label : String, new_owner : ByStr20)
  label_hash = builtin sha256hash label;
  name_hash_input = builtin concat null_hash label_hash;
  name_hash = builtin sha256hash name_hash_input;

  name_record <- registry[name_hash];
  name_owner = get_record_owner name_record;
  is_ok_name = builtin eq name_owner null_address;

  match is_ok_name with
  | True =>
    new_record = Record new_owner null_address null_address timestamp_zero;
    registry[name_hash] := new_record;
    e = {_eventname : "claimZone"; label : label; owner : new_owner};
    event e
  | False =>
  end
end

transition configureZoneResolver (name_hash : ByStr32, new_resolver : ByStr20)
  name_record <- registry[name_hash];
  name_owner = get_record_owner name_record;
  name_prev_owner = get_record_prev_owner name_record;
  name_ttl = get_record_ttl name_record;

  is_ok_name = builtin eq name_owner _sender;

  match is_ok_name with
  | True =>
    new_record = Record name_owner name_prev_owner new_resolver name_ttl;
    registry[name_hash] := new_record;
    e = {_eventname : "configureZoneResolver"; name_hash : name_hash; resolver : new_resolver};
    event e
  | False =>
  end
end

transition configureSubzoneTTL (parent_hash : ByStr32, label_hash : ByStr32, new_ttl : Uint32)
  parent_record <- registry[parent_hash];
  parent_owner = get_record_owner parent_record;

  is_ok_parent = builtin eq parent_owner _sender;

  match is_ok_parent with
  | True =>
    name_hash_input = builtin concat parent_hash label_hash;
    name_hash = builtin sha256hash name_hash_input;

    name_record <- registry[name_hash];
    name_owner = get_record_owner name_record;
    name_prev_owner = get_record_prev_owner name_record;
    name_resolver = get_record_resolver name_record;

    new_record = Record name_owner name_prev_owner name_resolver new_ttl;
    registry[name_hash] := new_record;
    e = {_eventname : "configureZoneTTL"; name_hash : name_hash; ttl : new_ttl};
    event e
  | False =>
  end
end

transition transferZone (name_hash : ByStr32, new_owner : ByStr20)
  name_record <- registry[name_hash];
  name_owner = get_record_owner name_record;
  is_ok_name = builtin eq name_owner _sender;

  match is_ok_name with
  | True =>
    name_ttl = get_record_ttl name_record;
    new_record = Record new_owner name_owner null_address name_ttl;
    registry[name_hash] := new_record;
    e = {_eventname : "transferZone"; name_hash : name_hash; owner : new_owner};
    event e
  | False =>
  end
end

transition transferSubzone (parent_hash : ByStr32, label : String, new_owner : ByStr20, new_ttl : Uint32)
  parent_record <- registry[parent_hash];
  parent_owner = get_record_owner parent_record;

  is_ok_parent = builtin eq parent_owner _sender;

  match is_ok_parent with
  | True =>
    label_hash = builtin sha256hash label;
    name_hash_input = builtin concat parent_hash label_hash;
    name_hash = builtin sha256hash name_hash_input;

    name_record <- registry[name_hash];
    name_owner = get_record_owner name_record;

    new_record = Record new_owner name_owner null_address new_ttl;
    registry[name_hash] := new_record;
    e = {_eventname : "transferSubzone"; parent_hash : parent_hash; label : label; owner : new_owner; ttl : new_ttl};
    event e
  | False =>
  end
end`
