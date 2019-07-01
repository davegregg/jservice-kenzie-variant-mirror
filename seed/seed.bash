### Usage: seed [database_name] [user_or_role_name] [hostname_or_ip]
seed () {
  local database=${1:-jservice}
  local role=${2:-jservice}
  local host=${3:-127.0.0.1}

  dropdb $database
  createdb $database
  ./create-schema.bash $role $host $database
  ./import-data.bash $database
}

seed $1 $2 $3
echo "\n(RE-)SEEDING COMPLETE"
